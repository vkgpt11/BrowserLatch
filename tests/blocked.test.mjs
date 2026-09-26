import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html = await readFile(new URL('../blocked.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../blocked.js', import.meta.url), 'utf8');

function page(query = '', rules = []) {
  const pending = [];
  let opened = 0;
  const dom = new JSDOM(html, {url: `chrome-extension://unit-test/blocked.html${query}`, runScripts: 'outside-only'});
  dom.window.chrome = {storage: {session: {set: async value => pending.push(value)}}, tabs: {getCurrent: async () => ({id: 42})}, declarativeNetRequest: {getDynamicRules: async () => {if (rules instanceof Error) throw rules; return rules;}}, runtime: {openOptionsPage: async () => {opened++;}}};
  dom.window.eval(script);
  return {dom, pending, opened: () => opened};
}

test('blocked page identifies the denied hostname and passes it to parent settings', async () => {
  const view = page('?site=www.youtube.com#https://www.youtube.com/watch?v=sample&t=2');
  assert.match(view.dom.window.document.querySelector('.brand img').getAttribute('src'), /icon48\.png$/);
  assert.equal(view.dom.window.document.querySelector('#manage').textContent, 'Open parent settings');
  assert.equal(view.dom.window.document.querySelector('#denied-domain').textContent, 'www.youtube.com');
  assert.equal(view.dom.window.document.querySelector('#denied-site').hidden, false);
  view.dom.window.document.querySelector('#manage').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.pending[0].pendingSite.host, 'www.youtube.com');
  assert.equal(view.pending[0].pendingSite.requestedUrl, 'https://www.youtube.com/watch?v=sample&t=2');
  assert.equal(view.pending[0].pendingSite.tabId, 42);
  assert.equal(view.dom.window.location.hash, '');
  assert.ok(view.pending[0].pendingSite.capturedAt > 0);
  assert.equal(view.opened(), 1);
});

test('blocked page discards a return address for a different website', async () => {
  const view = page('?site=www.youtube.com#https://other.test/path');
  view.dom.window.document.querySelector('#manage').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.pending[0].pendingSite.requestedUrl, '');
  view.dom.window.close();
});

test('blocked page gives a plain reason for each active rule type', async () => {
  const cases = [
    [[], /not on your allowed websites list/],
    [[{id: 104}], /on your blocked websites list/],
    [[{id: 100, condition: {excludedRequestDomains: ['youtube.com']}}], /part of an allowed website/],
    [[{id: 102}], /blocked by your website settings/],
    [new Error('Rules unavailable'), /blocked by your website settings/]
  ];
  for (const [rules, expected] of cases) {
    const view = page('?site=www.youtube.com', rules);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(view.dom.window.document.querySelector('#block-reason').textContent, expected);
    view.dom.window.close();
  }
});

test('generic fallback and malformed host do not offer a misleading site', async () => {
  for (const query of ['', '?site=https%3A%2F%2Fevil.test%2Fpath', '?site=%3Cscript%3E']) {
    const view = page(query);
    assert.equal(view.dom.window.document.querySelector('#denied-site').hidden, true);
    view.dom.window.document.querySelector('#manage').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(view.pending, []);
    assert.equal(view.opened(), 1);
  }
});
