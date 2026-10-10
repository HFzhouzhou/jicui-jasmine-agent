import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { RagStore } from '../server/rag/store.js';

// Synthetic documents and labels fixed before evaluating. These are not brand claims or production accuracy estimates.
const corpus = [
  {key: 'storage', title: '茶叶储存指南', text: '茶叶应放在阴凉干燥处，使用密封容器储存，避免阳光直射和异味。每次取茶后应及时封口，不要靠近灶台或清洁用品。未开封包装同样需要防潮。'},
  {key: 'scenting', title: '茉莉花茶窨制工艺', text: '窨制是让茶坯与鲜茉莉花反复接触、吸收花香的工艺。窨花过程中需要观察花堆温度并通花散热，完成后筛出花渣。香气由鲜花进入茶坯，并非简单把花瓣留在茶里。'},
  {key: 'origin', title: '茶叶产地追溯', text: '这份演示资料中的原料来自广西横州。每批茶叶都要保留产地、供应商和批次记录，采购人员应核对原产地证明。不同批次不能混用追溯信息。'},
  {key: 'allergens', title: '乳制品过敏提醒', text: '鲜奶饮品含乳制品，可能涉及牛奶蛋白等过敏原。乳制品过敏的顾客应先核对具体配料与门店操作信息。共享设备无法直接保证没有交叉接触，不能承诺任何饮品绝对不过敏。'},
  {key: 'caffeine', title: '茶饮咖啡因说明', text: '茶叶天然含咖啡因，冰饮、加奶或调整甜度都不能自动去除咖啡因。具体含量受原料、浸泡时间和份量影响；这份资料未提供每杯的检测值。'},
  {key: 'refund', title: '订单退款与售后', text: '饮品洒漏或存在质量问题时，可向原购买门店申请退款或售后。请提供订单编号、购买时间和问题照片，由门店核实具体处理方式。'},
  {key: 'delivery', title: '外卖配送说明', text: '演示门店的外卖配送通常需要三十分钟左右，实际送达时间受距离、天气与订单数量影响。超出配送范围时不能承诺送达，顾客应以订单页显示的预计时间为准。'},
  {key: 'sweetness', title: '饮品甜度选项', text: '演示菜单提供全糖、半糖和不另外加糖三种甜度。具体商品可选糖度以门店配置为准，不另外加糖并不代表原料完全不含糖，水果和乳制品可能自带糖分。'},
  {key: 'story', title: '品牌故事', text: '这份虚构的品牌故事以东方茶文化与茉莉花香为创作灵感，强调茶园、花田和日常饮茶生活之间的联系。它是用于检索测试的创作资料，不代表真实品牌历史。'},
  {key: 'invoice', title: '电子发票申请', text: '申请电子发票时，开票请提供单位抬头、纳税人识别号和接收邮箱。个人发票可填写个人抬头。请向购买门店提交对应订单编号，不要在公开聊天中发送完整税务资料。'},
  {key: 'hours', title: '门店营业时间', text: '演示旗舰店的营业时间为上午九点至晚上九点，每周二休息。节假日可能调整开门和打烊时间，出发前请查看门店当天公告。'},
  {key: 'shelf', title: '现制饮品保质期', text: '现制饮品建议收到后尽快饮用，不建议隔夜保存。常温久放可能影响品质，具体保质期应以商品包装上的有效期与储存条件说明为准。'},
] as const;
interface Example {kind: 'direct' | 'paraphrase' | 'english' | 'typo' | 'abbreviation' | 'long' | 'irrelevant'; query: string; expected?: string; knownLexicalGap?: boolean}
const examples: Example[] = [
  {kind: 'direct', query: '茶叶怎样储存？', expected: 'storage'},
  {kind: 'direct', query: '窨制工艺是怎么做的？', expected: 'scenting'},
  {kind: 'direct', query: '原产地和批次记录怎么核对？', expected: 'origin'},
  {kind: 'direct', query: '乳制品过敏需要注意什么？', expected: 'allergens'},
  {kind: 'direct', query: '订单退款要提供什么？', expected: 'refund'},
  {kind: 'direct', query: '外卖配送一般要多久？', expected: 'delivery'},
  {kind: 'direct', query: '有哪些甜度可以选？', expected: 'sweetness'},
  {kind: 'direct', query: '介绍品牌故事', expected: 'story'},
  {kind: 'paraphrase', query: '奶茶能放过夜吗？', expected: 'shelf', knownLexicalGap: true},
  {kind: 'paraphrase', query: '茶叶应该怎么保管？', expected: 'storage'},
  {kind: 'english', query: 'What is caffeine?', expected: 'caffeine'},
  {kind: 'english', query: 'milk allergy', expected: 'allergens'},
  {kind: 'typo', query: '咖啡应是什么？', expected: 'caffeine'},
  {kind: 'abbreviation', query: '发票抬头咋填？', expected: 'invoice'},
  {kind: 'long', query: '我准备明天上午到店，路上大概半个小时，想先把行程安排好。请问你们几点开门、几点打烊，周二是否营业？', expected: 'hours'},
  {kind: 'long', query: '我比较在意甜度，不过这次不是问怎么选糖。我其实想了解一下你们茶叶的产地，以及是不是每个批次都要保留产地记录。', expected: 'origin'},
  {kind: 'irrelevant', query: '量子计算机的错误控制怎么做？'},
  {kind: 'irrelevant', query: '茉莉茶是否能包治糖尿病？'},
  {kind: 'irrelevant', query: '你们品牌的火星机票多少钱？'},
  {kind: 'irrelevant', query: '明天比特币的价格涨还是跌？'},
];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function publish(rag: RagStore, title: string, text: string, key: string) {
  const document = rag.ingest({title, filename: `${key}.txt`, format: 'txt', source: '人工标注检索评估合成资料', hash: hash(`${key}\0${text}`), pages: [{text}], warnings: []}).document;
  return rag.updateDocument(document.id, {status: 'published'}, document.version);
}

test('hand-labelled retrieval evaluation reports hits, reciprocal rank, misses and refusal separately', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close()); const rag = new RagStore(db);
  const keys = new Map(corpus.map(document => [publish(rag, document.title, document.text, document.key).id, document.key]));
  const rows = examples.map(example => {
    const hits = rag.search(example.query, {limit: 3}).hits.map(hit => keys.get(hit.documentId));
    const rank = example.expected ? hits.indexOf(example.expected as typeof corpus[number]['key']) + 1 : 0;
    return {...example, hits, rank, correct: example.expected ? rank > 0 : hits.length === 0};
  });
  const answerable = rows.filter(row => row.expected), unrelated = rows.filter(row => !row.expected);
  const byKind = Object.fromEntries([...new Set(rows.map(row => row.kind))].map(kind => {const group = rows.filter(row => row.kind === kind); return [kind, {passed: group.filter(row => row.correct).length, total: group.length}];}));
  t.diagnostic(JSON.stringify({evaluation: 'synthetic-local-lexical-only', documents: corpus.length, queries: rows.length, answerable: answerable.length, hitAt3: answerable.filter(row => row.correct).length / answerable.length, mrrAt3: answerable.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / answerable.length, unrelatedRefusal: `${unrelated.filter(row => row.correct).length}/${unrelated.length}`, byKind, failures: rows.filter(row => !row.correct)}, null, 2));
  // The explicitly documented semantic gap is counted as a miss; it is not silently excluded from metrics.
  assert.ok(answerable.filter(row => !row.knownLexicalGap).every(row => row.correct), 'Previously supported queries must still find their labelled document');
  assert.ok(unrelated.every(row => row.correct), 'Unrelated queries must not receive accidental matches');
});

test('temporary disk index measures approximately 500k characters with bounded query latency', t => {
  const directory = mkdtempSync(join(tmpdir(), 'jasmine-rag-benchmark-')), db = new DatabaseSync(join(directory, 'benchmark.sqlite'));
  t.after(() => {db.close(); rmSync(directory, {recursive: true, force: true});});
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const rag = new RagStore(db), start = performance.now();
  for (let index = 0; index < 100; index++) {
    const theme = corpus[index % corpus.length];
    let body = '';
    for (let section = 0; body.length < 5000; section++) body += `\n\n## 第${section + 1}节：记录${index}-${section}\n${theme.text}\n本节核对记录编号 ${index}-${section}，执行人员需按当前资料检查相应字段，发现不一致时保留原始凭证并更新记录。`;
    publish(rag, `${theme.title} · 评估门店${index}`, body.slice(0, 5000), `benchmark-${index}`);
  }
  const indexingMs = performance.now() - start;
  for (const example of examples) rag.search(example.query, {limit: 5});
  const samples: number[] = [];
  for (let index = 0; index < 100; index++) {
    const queryStart = performance.now(); rag.search(examples[index % examples.length].query, {limit: 5}); samples.push(performance.now() - queryStart);
  }
  samples.sort((a, b) => a - b);
  t.diagnostic(JSON.stringify({benchmark: 'local-synthetic-disk-SQLite', runtime: `${process.platform}/${process.arch} ${process.version}`, ...rag.stats(), importAndPublishMs: Math.round(indexingMs), warmupQueries: 20, measuredQueries: 100, queryP50Ms: Number(samples[49].toFixed(2)), queryP95Ms: Number(samples[94].toFixed(2)), queryMaxMs: Number(samples[99].toFixed(2)), notes: 'Synthetic repeated subject matter; current workstation only, not production server throughput.'}));
  assert.equal(rag.stats().documents, 100); assert.ok(rag.stats().characters >= 499_000 && rag.stats().characters <= 500_000);
});
