import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {parseDomains, buildRules} from '../policy.mjs';
import {createPasswordRecord, verifyPassword, validatePassword} from '../auth.mjs';

globalThis.crypto ??= webcrypto;

test('password records are salted and verify without storing plaintext', async () => {
  assert.throws(() => validatePassword('short'));
  const first = await createPasswordRecord('correct horse');
  const second = await createPasswordRecord('correct horse');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(JSON.stringify(first).includes('correct horse'), false);
  assert.equal(await verifyPassword('correct horse', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

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
  assert.ok(allow.condition.resourceTypes.includes('main_frame'));
  assert.ok(allow.condition.resourceTypes.includes('xmlhttprequest'));
  assert.equal(allow.condition.excludedResourceTypes, undefined);
  const supporting = buildRules(['youtube.com'])[1];
  assert.deepEqual(supporting.condition.initiatorDomains, ['youtube.com']);
  assert.ok(supporting.condition.resourceTypes.includes('media'));
  assert.ok(supporting.condition.resourceTypes.includes('xmlhttprequest'));
  assert.equal(supporting.condition.resourceTypes.includes('main_frame'), false);
  assert.equal(supporting.condition.resourceTypes.includes('sub_frame'), false);
  const baseline = JSON.parse(await readFile(new URL('../rules.json', import.meta.url)));
  assert.ok(baseline.every(rule => rule.priority < allow.priority));
  assert.equal(baseline[0].action.type, 'block');
  assert.deepEqual(baseline[0].condition.excludedResourceTypes, ['main_frame']);
  assert.ok(new RegExp(baseline[1].condition.regexFilter).test('https://unlisted.test/'));
});
test('worker protects rules, rejects foreign senders and preserves rules after failures', async () => {
  let listener, installedListener, persisted = [], fail = false, local = {};
  const chrome = {
    action: {onClicked: {addListener() {}}},
    runtime: {id: 'unit-test', getURL: path => `chrome-extension://unit-test/${path}`, openOptionsPage() {}, onInstalled: {addListener(fn) {installedListener = fn;}}, onMessage: {addListener(fn) {listener = fn;}}},
    storage: {local: {setAccessLevel() {}, get: async keys => Object.fromEntries(keys.filter(key => key in local).map(key => [key, structuredClone(local[key])])), set: async values => Object.assign(local, structuredClone(values))}},
    declarativeNetRequest: {
      getDynamicRules: async () => structuredClone(persisted),
      updateDynamicRules: async ({addRules}) => {if (fail) throw new Error('Rejected update'); persisted = structuredClone(addRules);}
    }
  };
  const source = (await readFile(new URL('../background.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const start = () => vm.runInNewContext(source, {chrome, parseDomains, buildRules, createPasswordRecord, verifyPassword, Date});
  start();
  const sender = {id: chrome.runtime.id, url: chrome.runtime.getURL('options.html')};
  const send = message => new Promise(resolve => listener(message, sender, resolve));
  assert.equal(listener({type: 'save', text: 'evil.test'}, {id: 'foreign'}, () => assert.fail()), undefined);
  assert.equal((await send({type: 'status'})).configured, false);
  assert.equal((await send({type: 'save', text: 'example.com'})).ok, false);
  assert.equal((await send({type: 'setup', password: 'parent passphrase'})).ok, true);
  assert.equal((await send({type: 'save', text: 'example.com'})).ok, true);
  await send({type: 'lock'});
  assert.equal((await send({type: 'read'})).ok, false);
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await send({type: 'unlock', password: 'wrong password'})).ok, false);
  assert.ok((await send({type: 'status'})).retryAfterMs > 0);
  assert.equal((await send({type: 'unlock', password: 'parent passphrase'})).ok, false);
  local.authFailures = {count: 0, lockedUntil: 0};
  assert.equal((await send({type: 'unlock', password: 'parent passphrase'})).ok, true);
  assert.equal((await send({type: 'changePassword', currentPassword: 'parent passphrase', newPassword: 'replacement passphrase'})).ok, true);
  await send({type: 'lock'});
  assert.equal((await send({type: 'unlock', password: 'parent passphrase'})).ok, false);
  assert.equal((await send({type: 'unlock', password: 'replacement passphrase'})).ok, true);
  assert.deepEqual((await send({type: 'read'})).domains, ['example.com']);
  persisted = [{id: 100, priority: 3, action: {type: 'allow'}, condition: {requestDomains: ['youtube.com'], excludedResourceTypes: []}}];
  await installedListener({reason: 'update'});
  assert.deepEqual((await send({type: 'read'})).domains, ['youtube.com']);
  assert.ok(persisted[0].condition.resourceTypes.includes('main_frame'));
  assert.deepEqual(persisted[1].condition.initiatorDomains, ['youtube.com']);
  fail = true;
  assert.equal((await send({type: 'save', text: 'other.test'})).ok, false);
  assert.deepEqual((await send({type: 'read'})).domains, ['youtube.com']);
  fail = false;
  assert.equal((await send({type: 'save', text: '*.com'})).ok, false);
  assert.deepEqual((await send({type: 'read'})).domains, ['youtube.com']);
  await send({type: 'save', text: ''});
  assert.equal((await send({type: 'read'})).domains.length, 0);
});
