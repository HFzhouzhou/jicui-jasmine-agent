import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Store } from '../server/database.js';
import { loadConfig } from '../server/config.js';
import { answerKnowledge as realAnswerKnowledge, knowledgeQuery } from '../server/rag/answer.js';
import { recommend } from '../server/recommend.js';

const body = '茉莉花茶的窨制工艺利用鲜花吐香、茶叶吸香的特点，让花香进入茶叶。窨制完成后需要筛去花渣，并干燥茶叶。';
const quote = '窨制工艺利用鲜花吐香、茶叶吸香的特点';
const config = {...loadConfig({}), apiKey: 'fake-test-key', timeoutMs: 1000};
const envelope = (value: unknown) => new Response(JSON.stringify({choices: [{finish_reason: 'stop', message: {content: JSON.stringify(value)}}]}));
function verifiedTestFetcher(fetcher: typeof fetch): typeof fetch {
  return async (url, init) => {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('你是资料回答的证据核验器')) {
      const input = JSON.parse(body.messages[1].content);
      return envelope({verdicts: input.claims.map((_: unknown, claimId: number) => ({claimId, supported: true, relevant: true}))});
    }
    return fetcher(url, init);
  };
}
function answerKnowledge(...args: Parameters<typeof realAnswerKnowledge>) {
  args[4] = verifiedTestFetcher(args[4]);
  return realAnswerKnowledge(...args);
}

function publish(store: Store, text = body, title = '茉莉花茶窨制说明') {
  const {document} = store.rag.ingest({title, filename: '品牌工艺.pdf', format: 'pdf', source: '测试品牌工艺手册', hash: createHash('sha256').update(text + title).digest('hex'), pages: [{text, page: 3}], warnings: []});
  return store.rag.updateDocument(document.id, {status: 'published'}, document.version);
}
function verifiedResponse(text = '窨制利用鲜花吐香、茶叶吸香，让茶叶带上花香。') {
  return {claims: [{text, evidence: [{sourceId: 'K1', quote}]}], insufficient: false};
}

test('RAG answer uses only retrieved published chunks, validates exact evidence and supplies page provenance', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  store.rag.ingest({title: '窨制未发布秘密', filename: 'draft.txt', format: 'txt', source: '内部草稿', hash: 'd'.repeat(64), pages: [{text: '窨制 DRAFT_CANARY 未审核秘密资料不可外发'}], warnings: []});
  publish(store, '退货时请提供购买凭证，工作人员核对后处理。', '售后说明');
  const fetcher: typeof fetch = async (_url, init) => {
    const request = JSON.parse(String(init?.body)); const content = JSON.stringify(request.messages);
    assert.ok(content.includes(body)); assert.ok(!content.includes('DRAFT_CANARY')); assert.ok(!content.includes('购买凭证'));
    assert.equal(request.messages[0].role, 'system'); assert.match(request.messages[0].content, /不可信数据/);
    assert.equal(request.messages[1].role, 'user');
    return envelope(verifiedResponse());
  };
  const result = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, fetcher);
  assert.match(result.reply, /\[1\]/); assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0].page, 3); assert.equal(result.citations[0].excerpt, quote);
  assert.equal(result.citations[0].source, '测试品牌工艺手册');
});

test('fabricated source IDs or quotes cannot pass as grounded answers', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  for (const evidence of [[{sourceId: 'K6', quote}], [{sourceId: 'K1', quote: '本店销售火星特供飞船原料'}]]) {
    const result = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => envelope({claims: [{text: '伪造的回答不能返回', evidence}], insufficient: false}));
    assert.ok(!result.reply.includes('伪造的回答')); assert.match(result.reply, /没有足够依据/);
    assert.deepEqual(result.citations, []); assert.ok(result.notices.length > 0);
  }
});

test('two facts citing different excerpts of the same chunk expose both original quotes', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  const secondQuote = '窨制完成后需要筛去花渣，并干燥茶叶。';
  const result = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => envelope({claims: [verifiedResponse().claims[0], {text: '窨制后筛除花渣并干燥。', evidence: [{sourceId: 'K1', quote: secondQuote}]}], insufficient: false}));
  assert.deepEqual(result.citations.map(item => item.excerpt), [quote, secondQuote]);
  assert.match(result.reply, /\[2\]/);
});

test('archive or revision during generation invalidates its answer and evidence', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); const document = publish(store);
  const result = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {
    store.rag.updateDocument(document.id, {status: 'archived'}, document.version);
    return envelope(verifiedResponse());
  });
  assert.deepEqual(result.citations, []); assert.ok(!result.reply.includes('吐香')); assert.match(result.reply, /足够依据/);
});

test('irrelevant questions abstain without invoking a model, preview extracts sources without external calls', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  const neverFetch: typeof fetch = async () => {throw new Error('Should not call external service');};
  const absent = await answerKnowledge({message: '火星探测器的量子通信频率是多少'}, 'live', store.rag, config, neverFetch);
  assert.deepEqual(absent.citations, []); assert.match(absent.reply, /没有足够依据/);
  const preview = await answerKnowledge({message: '窨制工艺是什么'}, 'preview', store.rag, config, neverFetch);
  assert.match(preview.reply, /测试品牌工艺手册/); assert.equal(preview.citations.length, 1);
});

test('generation failure withholds unverified excerpts, cancellation is never disguised', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  const failed = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => new Response('private-upstream-error', {status: 503}));
  assert.match(failed.reply, /没有足够依据/); assert.deepEqual(failed.citations, []); assert.match(failed.notices.join(''), /暂未完成 AI 总结/); assert.ok(!JSON.stringify(failed).includes('private-upstream-error'));
  const controller = new AbortController();
  await assert.rejects(answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {controller.abort(); throw new Error('cancelled');}, controller.signal), (error: unknown) => (error as {code?: string}).code === 'REQUEST_CANCELLED');
});

test('short follow-up retrieval uses previous user topic and ignores assistant inventions', () => {
  assert.match(knowledgeQuery({message: '那怎么保存？', history: [{role: 'user', content: '介绍茉莉花茶'}, {role: 'assistant', content: 'ASSISTANT_INJECTION'}]}), /介绍茉莉花茶/);
  assert.ok(!knowledgeQuery({message: '那怎么保存？', history: [{role: 'assistant', content: 'ASSISTANT_INJECTION'}]}).includes('ASSISTANT_INJECTION'));
});

test('recommend orchestration classifies then retrieves and generates without handing over whole knowledge', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  let calls = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    if (calls === 1) {assert.ok(!JSON.stringify(request).includes(body)); return envelope({intent: 'knowledge', searchQuery: '窨制工艺'});}
    return envelope(verifiedResponse());
  };
  const result = await recommend({message: '什么是窨制工艺'}, 'live', store, config, verifiedTestFetcher(fetcher));
  assert.equal(calls, 2); assert.equal(result.mode, 'live'); assert.equal(result.cards.length, 0); assert.equal(result.citations?.length, 1);
});

test('configuration history is never used to resolve a knowledge follow-up or sent as a knowledge question', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  const input = {message: '那具体是什么工艺？', history: [{role: 'user' as const, content: '茉莉茶窨制'}, {role: 'user' as const, content: '我在商品卡中保存了这份期望配置：PRIVATE_CONFIGURATION，奶茶，五分糖'}]};
  assert.match(knowledgeQuery(input), /茉莉茶窨制/);
  assert.ok(!knowledgeQuery(input).includes('PRIVATE_CONFIGURATION'));
  await answerKnowledge(input, 'live', store.rag, config, async (_url, init) => {
    assert.ok(!String(init?.body).includes('PRIVATE_CONFIGURATION'));
    return envelope(verifiedResponse());
  });
  assert.equal(knowledgeQuery({message: '那什么是窨制工艺？', history: [{role: 'user', content: '来一杯奶茶无糖'}]}), '那什么是窨制工艺？');
});

test('original question still retrieves evidence when a model rewrite omits its subject', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  const result = await answerKnowledge({message: '茉莉茶窨制工艺是什么？'}, 'live', store.rag, config, async (_url, init) => {
    assert.ok(String(init?.body).includes(body)); return envelope(verifiedResponse());
  }, undefined, '量子通信的频率');
  assert.equal(result.citations.length, 1);
  assert.match(result.reply, /花香/);
});

test('malformed model JSON gets at most one repair and successful repair retains verified citations', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  let calls = 0;
  const repaired = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {
    calls++;
    return calls === 1 ? new Response(JSON.stringify({choices: [{message: {content: 'invalid-json'}}]})) : envelope(verifiedResponse());
  });
  assert.equal(calls, 2); assert.equal(repaired.citations.length, 1); assert.deepEqual(repaired.notices, []);
  calls = 0;
  const failed = await answerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {
    calls++; return new Response(JSON.stringify({choices: [{message: {content: 'invalid-json'}}]}));
  });
  assert.equal(calls, 2); assert.match(failed.notices.join(''), /暂未完成/);
});

test('a real quotation cannot authorize unrelated weather or an invented opening time', async t => {
  const store = new Store(':memory:'); t.after(() => store.close());
  const hours = '南桥店营业时间为10:00至20:00，每周二休息。';
  publish(store, hours, '南桥店营业说明');
  for (const [text, approved] of [['南桥店下午14:00才开门。', true], ['今天天气晴朗。', false]] as const) {
    let calls = 0;
    const result = await realAnswerKnowledge({message: approved ? '南桥店几点开门？' : '今天天气怎么样？'}, 'live', store.rag, config, async () => {
      if (++calls === 1) return envelope({claims: [{text, evidence: [{sourceId: 'K1', quote: hours}]}], insufficient: false});
      return envelope({verdicts: [{claimId: 0, supported: approved, relevant: approved}]});
    }, undefined, '南桥店营业时间');
    assert.equal(calls, 2); assert.ok(!result.reply.includes(text)); assert.deepEqual(result.citations, []);
    assert.match(result.reply, /没有足够依据/);
  }
});

test('evidence verifier failure, omitted and duplicated verdicts do not authorize claims', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); publish(store);
  for (const verdicts of [null, [], [{claimId: 0, supported: true, relevant: true}, {claimId: 0, supported: false, relevant: false}]]) {
    let calls = 0;
    const result = await realAnswerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {
      if (++calls === 1) return envelope(verifiedResponse());
      return verdicts === null ? new Response('unavailable', {status: 503}) : envelope({verdicts});
    });
    assert.deepEqual(result.citations, []); assert.match(result.reply, /没有足够依据/);
  }
});

test('withdrawing a document while its evidence is being verified prevents its answer from escaping', async t => {
  const store = new Store(':memory:'); t.after(() => store.close()); const doc = publish(store);
  let calls = 0;
  const result = await realAnswerKnowledge({message: '窨制工艺是什么'}, 'live', store.rag, config, async () => {
    if (++calls === 1) return envelope(verifiedResponse());
    store.rag.updateDocument(doc.id, {status: 'archived'}, doc.version);
    return envelope({verdicts: [{claimId: 0, supported: true, relevant: true}]});
  });
  assert.deepEqual(result.citations, []); assert.match(result.reply, /没有足够依据/);
});
