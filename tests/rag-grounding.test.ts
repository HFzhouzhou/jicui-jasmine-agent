import test from 'node:test';
import assert from 'node:assert/strict';
import { quantitiesSupported } from '../server/rag/grounding.js';
import { confirmationSubjectQuery } from '../server/rag/answer.js';
const supported = (text: string, quote: string) => quantitiesSupported({text, evidence: [{title: '测试说明', quote}]});
test('numeric suffixes are not evidence for a smaller claimed quantity', () => {
  assert.equal(supported('标价0元', '标价10元'), false);
  assert.equal(supported('含5毫克', '含15毫克'), false);
  assert.equal(supported('需提前30分钟', '需提前130分钟'), false);
  assert.equal(supported('14:00开门', '10:00开门至20:00营业'), false);
});
test('equivalent units and zero-padded times retain direct numeric support', () => {
  assert.equal(supported('时长1小时', '时长60分钟'), true);
  assert.equal(supported('总重0.048千克', '总重48克'), true);
  assert.equal(supported('含量150毫克', '含量0.15克'), true);
  assert.equal(supported('09:00开门', '9:00开门'), true);
  assert.equal(supported('总重49克', '总重48克'), false);
});
test('corrective retrieval requires a separate substantive subject, not only an unknown code', () => {
  assert.equal(confirmationSubjectQuery('样品礼盒的封签贴哪里，编号是不是AB-999？'), '样品礼盒的封签贴哪里');
  assert.equal(confirmationSubjectQuery('AB-999是否存在？'), null);
  assert.equal(confirmationSubjectQuery('请确认，AB-999是否正确？'), null);
  assert.equal(confirmationSubjectQuery('请查询AB-999的资料'), null);
});
