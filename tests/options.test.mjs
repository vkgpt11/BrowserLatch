import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {parseDomains} from '../policy.mjs';

const html = await readFile(new URL('../options.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../options.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
const openWindows = new Set();
test.afterEach(() => { for (const window of openWindows) window.close(); openWindows.clear(); });

async function createPage({mode = 'allow', domains = [], exceptions = [], currentSite = '', legacyAllowed = [], legacyBlocked = [], expiryOffsetMs = 300000} = {}) {
  const dom = new JSDOM(html, {url: 'https://extension.test/options.html', runScripts: 'outside-only'});
  openWindows.add(dom.window);
  const state = {mode, domains, exceptions, currentSite, legacyAllowed, legacyBlocked, saved: {allow: [], block: [], allowExceptions: []}, revision: 1, unlocked: true, failSave: false, expiryOffsetMs};
  let onStorageChanged;
  dom.window.confirm = () => true;
  dom.window.chrome = {storage: {onChanged: {addListener(fn) {onStorageChanged = fn;}}}, runtime: {sendMessage: async message => {
    if (message.type === 'status') return {ok: true, configured: true, unlocked: state.unlocked, expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.type === 'read') return {ok: true, mode: state.mode, domains: state.domains, exceptions: state.exceptions, revision: String(state.revision), currentSite: state.currentSite, legacyAllowed: state.legacyAllowed, legacyBlocked: state.legacyBlocked, expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.type === 'lock') {state.unlocked = false; return {ok: true};}
    if (!state.unlocked) return {ok: false, error: 'Settings are locked.'};
    if (message.revision !== String(state.revision)) return {ok: false, error: 'The list changed in another tab. Reload settings before saving.'};
    if (message.type === 'save') {
      if (state.failSave) return {ok: false, error: 'Rejected update'};
      try { state.domains = parseDomains(message.domains); state.exceptions = parseDomains(message.exceptions ?? '');
        if (state.exceptions.some(child => !state.domains.some(parent => child !== parent && child.endsWith(`.${parent}`)))) throw new Error('Each blocked exception must be below an allowed parent domain.'); }
      catch (error) { return {ok: false, error: error.message}; }
      state.revision++;
    } else if (message.type === 'setMode') {
      if (state.mode === 'legacy') {state.saved.allow = [...state.legacyAllowed]; state.saved.block = [...state.legacyBlocked];
        state.saved.allowExceptions = state.legacyBlocked.filter(child => state.saved.allow.some(parent => child !== parent && child.endsWith(`.${parent}`)));}
      else {state.saved[state.mode] = [...state.domains]; if (state.mode === 'allow') state.saved.allowExceptions = [...state.exceptions];}
      state.mode = message.mode;
      state.domains = [...state.saved[state.mode]];
      state.exceptions = state.mode === 'allow' ? [...state.saved.allowExceptions] : [];
      state.revision++;
    } else return {ok: false, error: `Unexpected message: ${message.type}`};
    return {ok: true, mode: state.mode, domains: state.domains, exceptions: state.exceptions, revision: String(state.revision), currentSite: '', expiresAt: Date.now() + state.expiryOffsetMs};
  }}};
  dom.window.eval(script);
  await settle();
  const $ = selector => dom.window.document.querySelector(selector);
  const fire = (selector, type) => $(selector).dispatchEvent(new dom.window.Event(type, {bubbles: true, cancelable: true}));
  return {dom, $, fire, state, triggerSite() {onStorageChanged({pendingSite: {newValue: {host: state.currentSite}}}, 'session');}, triggerLock() {onStorageChanged({accessLockVersion: {newValue: Date.now()}}, 'session');}};
}

test('one active list can be searched and checked against effective access', async () => {
  const page = await createPage({domains: ['example.com', 'youtube.com']});
  const {$, fire} = page;
  assert.equal($('#list-title').textContent, 'Allowed websites');
  assert.equal($('#sites').options.length, 2);
  $('#search').value = 'YOUTUBE';
  fire('#search', 'input');
  assert.equal($('#sites').options.length, 1);
  $('#check-domain').value = 'https://www.youtube.com/watch?v=sample';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Allowed by youtube.com/);
  $('#check-domain').value = 'other.test';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked because/);
  page.dom.window.close();
});

test('add, remove, and undo keep the active list in sync', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  $('#new-domain').value = 'youtube.com';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com', 'youtube.com']);
  assert.equal($('#undo').hidden, false);
  $('#sites').value = 'youtube.com';
  fire('#sites', 'change');
  fire('#remove', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com', 'youtube.com']);
  page.dom.window.close();
});

test('mode switch changes default access and restores the other saved list', async () => {
  const page = await createPage({domains: ['youtube.com']});
  const {$, fire, state} = page;
  $('#mode-select').value = 'block';
  fire('#mode-select', 'change');
  fire('#mode-form', 'submit');
  await settle();
  assert.equal(state.mode, 'block');
  assert.deepEqual(state.domains, []);
  assert.match($('#mode-summary').textContent, /Every other website can open/);
  $('#new-domain').value = 'bad.test';
  fire('#add-form', 'submit');
  await settle();
  $('#check-domain').value = 'bad.test';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked by bad.test/);
  $('#mode-select').value = 'allow';
  fire('#mode-select', 'change');
  fire('#mode-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['youtube.com']);
  page.dom.window.close();
});

test('legacy mixed rules require a one-time choice without losing the other list', async () => {
  const page = await createPage({mode: 'legacy', domains: ['example.com'], legacyAllowed: ['example.com'], legacyBlocked: ['kids.example.com']});
  const {$, fire, state} = page;
  assert.equal($('#legacy-note').hidden, false);
  assert.equal($('#rules-panel').hidden, true);
  $('#mode-select').value = 'block';
  fire('#mode-form', 'submit');
  await settle();
  assert.equal($('#legacy-note').hidden, true);
  assert.deepEqual(state.domains, ['kids.example.com']);
  page.dom.window.close();
});

test('parent can inspect, add, remove, and undo blocked child exceptions', async () => {
  const page = await createPage({domains: ['example.com'], exceptions: ['kids.example.com'], currentSite: 'games.kids.example.com'});
  const {$, fire, state} = page;
  assert.equal($('#exceptions-panel').hidden, false);
  assert.match($('#current-site-state').textContent, /Blocked by exception kids.example.com/);
  assert.equal($('#current-site-action').textContent, 'View blocked exception');
  fire('#current-site-action', 'click');
  assert.equal($('#exceptions').value, 'kids.example.com');
  $('#check-domain').value = 'www.example.com';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Allowed by example.com/);
  $('#check-domain').value = 'games.kids.example.com';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked by exception/);
  $('#exception-domain').value = 'video.example.com';
  fire('#exception-form', 'submit');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  $('#exceptions').value = 'video.example.com';
  fire('#exceptions', 'change');
  fire('#remove-exception', 'click');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com']);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  $('#sites').value = 'example.com';
  fire('#sites', 'change');
  fire('#remove', 'click');
  await settle();
  assert.deepEqual(state.domains, []);
  assert.deepEqual(state.exceptions, []);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  page.dom.window.close();
});

test('invalid entries and rejected saves retain the previous list', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  $('#new-domain').value = 'com';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  assert.match($('#status').textContent, /Not saved/);
  state.failSave = true;
  $('#new-domain').value = 'other.test';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  page.dom.window.close();
});

test('current-site shortcut prefills the entry without changing rules', async () => {
  const page = await createPage({domains: ['youtube.com'], currentSite: 'www.youtube.com'});
  const {$, fire, state} = page;
  assert.match($('#current-site-state').textContent, /Allowed by youtube.com/);
  fire('#current-site-action', 'click');
  assert.equal($('#new-domain').value, 'www.youtube.com');
  assert.deepEqual(state.domains, ['youtube.com']);
  page.dom.window.close();
});

test('an already open settings page refreshes its current-site shortcut', async () => {
  const page = await createPage({domains: ['youtube.com']});
  page.state.currentSite = 'new.test';
  page.triggerSite();
  await settle();
  assert.equal(page.$('#current-site-domain').textContent, 'new.test');
  page.dom.window.close();
});

test('visible website rules hide when parent access expires', async () => {
  const page = await createPage({domains: ['youtube.com'], expiryOffsetMs: 20});
  const {$} = page;
  assert.equal($('#settings').hidden, false);
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal($('#settings').hidden, true);
  assert.equal($('#sites').options.length, 0);
  page.dom.window.close();
});

test('locking another settings tab hides this tab immediately', async () => {
  const page = await createPage({domains: ['youtube.com']});
  assert.equal(page.$('#settings').hidden, false);
  page.triggerLock();
  assert.equal(page.$('#settings').hidden, true);
  assert.equal(page.$('#sites').options.length, 0);
  page.dom.window.close();
});
