import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {parseDomains} from '../policy.mjs';

const html = await readFile(new URL('../options.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../options.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function createPage({allowed = [], blocked = [], currentSite = ''} = {}) {
  const dom = new JSDOM(html, {url: 'https://extension.test/options.html', runScripts: 'outside-only'});
  const document = dom.window.document;
  const state = {allowed, blocked, currentSite, saves: [], failSave: false};
  dom.window.chrome = {runtime: {sendMessage: async message => {
    if (message.type === 'status') return {ok: true, configured: true, unlocked: true};
    if (message.type === 'read') return {ok: true, allowed: state.allowed, blocked: state.blocked, currentSite: state.currentSite};
    if (message.type === 'save') {
      state.saves.push(message);
      if (state.failSave) return {ok: false, error: 'Rejected update'};
      try {
        const nextAllowed = parseDomains(message.allowed);
        const nextBlocked = parseDomains(message.blocked);
        if (nextAllowed.some(domain => nextBlocked.includes(domain))) throw new Error('A domain cannot be both allowed and blocked.');
        state.allowed = nextAllowed;
        state.blocked = nextBlocked;
        return {ok: true, allowed: state.allowed, blocked: state.blocked};
      } catch (error) { return {ok: false, error: error.message}; }
    }
    if (message.type === 'lock') return {ok: true};
    return {ok: false, error: `Unexpected message: ${message.type}`};
  }}};
  dom.window.eval(script);
  await settle();
  const $ = selector => document.querySelector(selector);
  const fire = (selector, type) => $(selector).dispatchEvent(new dom.window.Event(type, {bubbles: true, cancelable: true}));
  return {dom, $, fire, state};
}

test('search and status filter show only matching saved websites', async () => {
  const page = await createPage({allowed: ['example.com', 'youtube.com'], blocked: ['kids.example.com']});
  const {$, fire} = page;
  assert.equal($('#settings').hidden, false);
  assert.equal($('#sites').options.length, 3);
  $('#search').value = 'YOUTUBE';
  fire('#search', 'input');
  assert.equal($('#sites').options.length, 1);
  assert.equal($('#sites').options[0].value, 'youtube.com');
  assert.equal($('#match-count').textContent, '1 matching website');
  $('#search').value = '';
  $('#filter').value = 'blocked';
  fire('#filter', 'change');
  assert.equal($('#sites').options.length, 1);
  assert.equal($('#sites').options[0].value, 'kids.example.com');
  page.dom.window.close();
});

test('checkbox changes a selected site and removing it updates the saved rules', async () => {
  const page = await createPage({allowed: ['example.com'], blocked: ['kids.example.com']});
  const {$, fire, state} = page;
  $('#sites').value = 'kids.example.com';
  fire('#sites', 'change');
  assert.equal($('#editor').hidden, false);
  assert.equal($('#selected-allowed').checked, false);
  $('#selected-allowed').checked = true;
  fire('#selected-allowed', 'change');
  await settle();
  assert.deepEqual(state.allowed, ['example.com', 'kids.example.com']);
  assert.deepEqual(state.blocked, []);
  assert.equal($('#selected-state').textContent, 'Allowed');
  fire('#remove', 'click');
  await settle();
  assert.deepEqual(state.allowed, ['example.com']);
  assert.equal($('#editor').hidden, true);
  page.dom.window.close();
});

test('toolbar hint pre-fills the current site but does not change a rule until Add is submitted', async () => {
  const page = await createPage({allowed: ['youtube.com'], currentSite: 'www.youtube.com'});
  const {$, fire, state} = page;
  assert.equal($('#current-site-box').hidden, false);
  assert.equal($('#current-site-state').textContent, 'Allowed');
  fire('#current-site-action', 'click');
  assert.equal($('#new-domain').value, 'www.youtube.com');
  assert.equal(state.saves.length, 0);
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.allowed, ['www.youtube.com', 'youtube.com']);
  assert.equal($('#sites').value, 'www.youtube.com');
  page.dom.window.close();
});

test('current-site shortcut identifies an explicit block and selects its saved entry', async () => {
  const page = await createPage({allowed: ['example.com'], blocked: ['kids.example.com'], currentSite: 'kids.example.com'});
  const {$, fire} = page;
  assert.equal($('#current-site-state').textContent, 'Blocked by a rule');
  assert.equal($('#current-site-action').textContent, 'Edit saved entry');
  $('#search').value = 'other';
  fire('#search', 'input');
  fire('#current-site-action', 'click');
  assert.equal($('#search').value, '');
  assert.equal($('#sites').value, 'kids.example.com');
  assert.equal($('#selected-allowed').checked, false);
  page.dom.window.close();
});

test('invalid entries and failed saves keep the previous rules visible', async () => {
  const page = await createPage({allowed: ['example.com']});
  const {$, fire, state} = page;
  $('#new-domain').value = 'https://bad.test/path';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.allowed, ['example.com']);
  assert.match($('#status').textContent, /Not saved/);
  state.failSave = true;
  $('#sites').value = 'example.com';
  fire('#sites', 'change');
  $('#selected-allowed').checked = false;
  fire('#selected-allowed', 'change');
  await settle();
  assert.deepEqual(state.allowed, ['example.com']);
  assert.equal($('#selected-allowed').checked, true);
  page.dom.window.close();
});
