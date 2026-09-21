import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseDomains, buildRules} from '../policy.mjs';

test('normalizes, deduplicates and supports international domains', () => {
  assert.deepEqual(parseDomains('EXAMPLE.com\nexample.com\n\nbücher.de'), ['example.com', 'xn--bcher-kva.de']);
  assert.deepEqual(parseDomains(''), []);
});
test('rejects entries that could accidentally broaden access', () => {
  for (const input of ['https://example.com/path', '*.com', 'example.com:443', 'user@example.com', 'example.com?q=x', 'example.com.', '-bad.com', 'a..com', 'example.com\\evil', 'two words']) {
    assert.throws(() => parseDomains(input), undefined, input);
  }
  assert.throws(() => parseDomains(Array.from({length: 501}, (_, n) => `a${n}.test`).join('\n')));
});
test('empty list creates no exceptions; allowed destinations include main frames', async () => {
  assert.deepEqual(buildRules([]), []);
  const [allow] = buildRules(['example.com']);
  assert.equal(allow.action.type, 'allow');
  assert.deepEqual(allow.condition.requestDomains, ['example.com']);
  assert.deepEqual(allow.condition.excludedResourceTypes, []);
  const baseline = JSON.parse(await readFile(new URL('../rules.json', import.meta.url)));
  assert.ok(baseline.every(rule => rule.priority < allow.priority));
  assert.equal(baseline[0].action.type, 'block');
  assert.deepEqual(baseline[0].condition.excludedResourceTypes, ['main_frame']);
  assert.ok(new RegExp(baseline[1].condition.regexFilter).test('https://unlisted.test/'));
});
test('worker persists rules, rejects foreign senders and preserves rules after failures', async () => {
  let listener, persisted = [], fail = false;
  const chrome = {
    action: {onClicked: {addListener() {}}},
    runtime: {id: 'unit-test', getURL: path => `chrome-extension://unit-test/${path}`, onInstalled: {addListener() {}}, onMessage: {addListener(fn) {listener = fn;}}},
    declarativeNetRequest: {
      getDynamicRules: async () => structuredClone(persisted),
      updateDynamicRules: async ({addRules}) => {if (fail) throw new Error('Rejected update'); persisted = structuredClone(addRules);}
    }
  };
  const source = (await readFile(new URL('../background.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/, '');
  const start = () => vm.runInNewContext(source, {chrome, parseDomains, buildRules});
  start();
  const sender = {id: chrome.runtime.id, url: chrome.runtime.getURL('options.html')};
  const send = message => new Promise(resolve => listener(message, sender, resolve));
  assert.equal(listener({type: 'save', text: 'evil.test'}, {id: 'foreign'}, () => assert.fail()), undefined);
  assert.equal((await send({type: 'save', text: 'example.com'})).ok, true);
  start(); // Simulate a worker restart; browser-owned rules survive.
  assert.deepEqual((await send({type: 'read'})).domains, ['example.com']);
  fail = true;
  assert.equal((await send({type: 'save', text: 'other.test'})).ok, false);
  assert.deepEqual((await send({type: 'read'})).domains, ['example.com']);
  fail = false;
  assert.equal((await send({type: 'save', text: '*.com'})).ok, false);
  assert.deepEqual((await send({type: 'read'})).domains, ['example.com']);
  await send({type: 'save', text: ''});
  assert.equal((await send({type: 'read'})).domains.length, 0);
});
