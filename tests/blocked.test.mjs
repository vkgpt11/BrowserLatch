import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html = await readFile(new URL('../blocked.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../blocked.js', import.meta.url), 'utf8');

function page(query = '') {
  const pending = [];
  let opened = 0;
  const dom = new JSDOM(html, {url: `chrome-extension://unit-test/blocked.html${query}`, runScripts: 'outside-only'});
  dom.window.chrome = {storage: {session: {set: async value => pending.push(value)}}, runtime: {openOptionsPage: async () => {opened++;}}};
  dom.window.eval(script);
  return {dom, pending, opened: () => opened};
}

test('blocked page identifies the denied hostname and passes it to parent settings', async () => {
  const view = page('?site=www.youtube.com');
  assert.equal(view.dom.window.document.querySelector('#denied-domain').textContent, 'www.youtube.com');
  assert.equal(view.dom.window.document.querySelector('#denied-site').hidden, false);
  view.dom.window.document.querySelector('#manage').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.pending[0].pendingSite.host, 'www.youtube.com');
  assert.ok(view.pending[0].pendingSite.capturedAt > 0);
  assert.equal(view.opened(), 1);
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
