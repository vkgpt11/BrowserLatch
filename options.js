const $ = selector => document.querySelector(selector);
const settings = $('#settings');
const authCard = $('#auth-card');
let mode = 'allow';
let domains = [];
let exceptions = [];
let revision = '';
let selected = '';
let selectedException = '';
let currentSite = '';
let expiresAt = 0;
let lockTimer;
let undoDomains = null;
let undoExceptions = null;
let busy = false;

const matchesDomain = (host, domain) => host === domain || host.endsWith(`.${domain}`);

function updateLockStatus() {
  const remaining = Math.max(0, expiresAt - Date.now());
  if (!settings.hidden && !remaining) { showLocked(true, 'Parent access expired. Enter the password again.'); return; }
  $('#access-status').textContent = `Parent access · locks in ${Math.ceil(remaining / 60000)} min`;
}

function setExpiry(value) {
  expiresAt = value || 0;
  window.clearInterval(lockTimer);
  if (expiresAt && !settings.hidden) {
    updateLockStatus();
    lockTimer = window.setInterval(updateLockStatus, 1000);
  }
}

async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Could not reach the extension.');
  if (result.expiresAt) expiresAt = result.expiresAt;
  return result;
}

function showLocked(configured, message = '') {
  window.clearInterval(lockTimer);
  expiresAt = 0;
  domains = [];
  exceptions = [];
  revision = '';
  undoDomains = null;
  undoExceptions = null;
  currentSite = '';
  selected = '';
  selectedException = '';
  $('#sites').replaceChildren();
  $('#exceptions').replaceChildren();
  $('#check-result').textContent = '';
  $('#legacy-backup-list').textContent = '';
  $('#current-site-domain').textContent = '';
  $('#selected-domain').textContent = '';
  $('#change-form').reset();
  $('#undo').hidden = true;
  settings.hidden = true;
  authCard.hidden = false;
  $('#access-status').hidden = true;
  $('#setup-panel').hidden = configured;
  $('#unlock-panel').hidden = !configured;
  $('#auth-status').textContent = message || (configured ? 'Settings are locked.' : 'Create a password before configuring websites.');
  (configured ? $('#password') : $('#new-password')).focus();
}

function explain(host) {
  const match = domains.filter(domain => matchesDomain(host, domain)).sort((a, b) => b.length - a.length)[0];
  if (mode === 'allow') {
    const exception = exceptions.filter(domain => matchesDomain(host, domain)).sort((a, b) => b.length - a.length)[0];
    return exception ? `Blocked by exception ${exception}.` : match ? `Allowed by ${match}.` : 'Blocked because it is not on the allowlist.';
  }
  return match ? `Blocked by ${match}.` : 'Allowed because it is not on the blocklist.';
}

function updatePreview() {
  const value = $('#new-domain').value.trim();
  $('#add-preview').textContent = value ? `${mode === 'allow' ? 'Allow' : 'Block'} ${value} and its subdomains.` : '';
}

function render() {
  const legacy = mode === 'legacy';
  $('#legacy-note').hidden = !legacy;
  $('#rules-panel').hidden = legacy;
  $('#exceptions-panel').hidden = legacy || mode !== 'allow';
  $('#check-panel').hidden = legacy;
  $('#mode-select').value = legacy ? 'allow' : mode;
  $('#apply-mode').disabled = !legacy && $('#mode-select').value === mode;
  $('#mode-summary').textContent = legacy ? 'Your previous version used both lists. Select one mode to continue.' :
    mode === 'allow' ? `Only listed websites open. Every other website is blocked.${exceptions.length ? ` ${exceptions.length} blocked subdomain ${exceptions.length === 1 ? 'exception' : 'exceptions'} active.` : ''}` : 'Listed websites are blocked. Every other website can open.';
  if (legacy) return;

  $('#list-title').textContent = mode === 'allow' ? 'Allowed websites' : 'Blocked websites';
  $('#list-description').textContent = mode === 'allow' ? 'These domains and their subdomains can open, except any blocked subdomains below.' : 'These domains and their subdomains cannot open.';
  $('#count').textContent = `${domains.length} listed`;
  const exceptionList = $('#exceptions');
  exceptionList.replaceChildren();
  exceptionList.size = Math.min(9, Math.max(3, exceptions.length));
  for (const domain of exceptions) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = `✕ Blocked  ${domain}`;
    option.selected = domain === selectedException;
    exceptionList.append(option);
  }
  if (!exceptions.length) {
    const empty = document.createElement('option');
    empty.textContent = 'No blocked exceptions';
    empty.disabled = true;
    exceptionList.append(empty);
  }
  if (!exceptions.includes(selectedException)) selectedException = '';
  exceptionList.value = selectedException;
  $('#remove-exception').disabled = !selectedException;
  const query = $('#search').value.trim().toLowerCase();
  const entries = domains.filter(domain => domain.includes(query));
  const list = $('#sites');
  list.size = Math.min(9, Math.max(3, entries.length));
  list.replaceChildren();
  for (const domain of entries) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = `${mode === 'allow' ? '✓ Allowed' : '✕ Blocked'}  ${domain}`;
    option.selected = domain === selected;
    list.append(option);
  }
  if (!entries.length) {
    const empty = document.createElement('option');
    empty.textContent = domains.length ? 'No matches' : 'No websites listed';
    empty.disabled = true;
    list.append(empty);
  }
  if (!entries.includes(selected)) selected = '';
  list.value = selected;
  $('#match-count').textContent = `${entries.length} matching ${entries.length === 1 ? 'website' : 'websites'}`;
  $('#editor').hidden = !selected;
  if (selected) {
    $('#selected-domain').textContent = selected;
    $('#selected-state').textContent = mode === 'allow' ? 'Allowed' : 'Blocked';
    $('#selected-state').classList.toggle('blocked-state', mode === 'block');
    $('#selected-effect').textContent = `Removing this entry will ${mode === 'allow' ? 'block' : 'allow'} it unless another listed parent domain still applies.`;
  }
  $('#current-site-box').hidden = !currentSite;
  if (currentSite) {
    $('#current-site-domain').textContent = currentSite;
    $('#current-site-state').textContent = explain(currentSite);
    $('#current-site-action').textContent = mode === 'allow' && exceptions.some(domain => matchesDomain(currentSite, domain)) ? 'View blocked exception' : domains.includes(currentSite) ? 'View this entry' : 'Use this website';
  }
  updatePreview();
}

function applyPolicy(result) {
  mode = result.mode;
  domains = [...result.domains];
  exceptions = [...(result.exceptions ?? [])];
  revision = result.revision;
  undoDomains = null;
  undoExceptions = null;
  $('#undo').hidden = true;
  currentSite = result.currentSite || '';
  selected = '';
  selectedException = '';
  if (mode === 'legacy') $('#legacy-counts').textContent = `${result.legacyAllowed.length} previously allowed · ${result.legacyBlocked.length} previously blocked`;
  $('#legacy-backup').hidden = !result.legacyAllowedBackup?.length;
  $('#legacy-backup-list').textContent = (result.legacyAllowedBackup ?? []).join('\n');
  render();
  authCard.hidden = true;
  settings.hidden = false;
  $('#access-status').hidden = false;
  setExpiry(result.expiresAt);
}

async function showSettings() { applyPolicy(await request({type: 'read'})); }

async function save(next, message, nextExceptions = exceptions, previous = domains, previousExceptions = exceptions) {
  if (busy) return false;
  busy = true;
  for (const control of settings.querySelectorAll('button,input,select')) control.disabled = true;
  try {
    const result = await request({type: 'save', domains: next.join('\n'), exceptions: nextExceptions.join('\n'), revision});
    domains = result.domains;
    exceptions = result.exceptions;
    revision = result.revision;
    undoDomains = [...previous];
    undoExceptions = [...previousExceptions];
    $('#undo').hidden = false;
    render();
    $('#status').textContent = `${message} Reload open websites to apply changes.`;
    setExpiry(result.expiresAt);
    return true;
  } catch (error) {
    if (/locked/i.test(error.message)) showLocked(true, error.message);
    else {
      $('#status').textContent = `Not saved: ${error.message}`;
      if (/another tab/i.test(error.message)) await showSettings();
      render();
    }
    return false;
  } finally {
    busy = false;
    for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
    $('#apply-mode').disabled = mode !== 'legacy' && $('#mode-select').value === mode;
    $('#remove-exception').disabled = !selectedException;
  }
}

request({type: 'status'}).then(result => result.unlocked ? showSettings() : showLocked(result.configured)).catch(error => showLocked(true, error.message));

document.addEventListener('visibilitychange', async () => {
  if (document.hidden || settings.hidden) return;
  try { if (!(await request({type: 'status'})).unlocked) showLocked(true, 'Parent access expired. Enter the password again.'); }
  catch { showLocked(true, 'Could not confirm parent access. Enter the password again.'); }
});

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === 'session' && changes.accessLockVersion?.newValue) { if (!settings.hidden) showLocked(true); return; }
  if (areaName !== 'session' || !changes.pendingSite?.newValue || settings.hidden) return;
  request({type: 'read'}).then(result => {
    if (result.revision !== revision) { undoDomains = null; undoExceptions = null; $('#undo').hidden = true; }
    currentSite = result.currentSite || '';
    domains = [...result.domains];
    exceptions = [...(result.exceptions ?? [])];
    revision = result.revision;
    render();
    setExpiry(result.expiresAt);
  }).catch(error => { if (/locked/i.test(error.message)) showLocked(true, error.message); });
});

$('#setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('#new-password').value !== $('#confirm-password').value) { $('#auth-status').textContent = 'Passwords do not match.'; return; }
  try { await request({type: 'setup', password: $('#new-password').value}); event.target.reset(); await showSettings(); }
  catch (error) { $('#auth-status').textContent = error.message; }
});

$('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request({type: 'unlock', password: $('#password').value}); event.target.reset(); await showSettings(); }
  catch (error) { $('#auth-status').textContent = error.message; }
});

$('#mode-select').addEventListener('change', () => { $('#apply-mode').disabled = mode !== 'legacy' && $('#mode-select').value === mode; });
$('#mode-form').addEventListener('submit', async event => {
  event.preventDefault();
  const nextMode = $('#mode-select').value;
  if (nextMode === mode) return;
  const warning = nextMode === 'block' ? 'Switch to Blocklist? Every website not on the blocklist will be allowed.' : 'Switch to Allowlist? Every website not on the allowlist will be blocked.';
  if (!window.confirm(`${warning}\n\nEach mode keeps its own saved list.`)) { $('#mode-select').value = mode === 'legacy' ? 'allow' : mode; return; }
  try {
    const result = await request({type: 'setMode', mode: nextMode, revision});
    applyPolicy(result);
    undoDomains = null;
    undoExceptions = null;
    $('#undo').hidden = true;
    $('#status').textContent = `${nextMode === 'allow' ? 'Allowlist' : 'Blocklist'} is now active. Reload open websites to apply changes. ${result.migrationNotice || ''}`;
  } catch (error) {
    if (/locked/i.test(error.message)) showLocked(true, error.message);
    else $('#mode-summary').textContent = `Mode not changed: ${error.message}`;
  }
});

$('#new-domain').addEventListener('input', updatePreview);
$('#add-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#new-domain').value.trim();
  if (domains.includes(input.toLowerCase())) { $('#status').textContent = `${input} is already listed.`; return; }
  const saved = await save([...domains, input], `${input} added to the ${mode === 'allow' ? 'allowlist' : 'blocklist'}.`);
  if (saved) {
    $('#new-domain').value = '';
    $('#search').value = '';
    try { selected = new URL(`https://${input}`).hostname.toLowerCase(); } catch { selected = ''; }
    render();
  }
});

$('#search').addEventListener('input', render);
$('#sites').addEventListener('change', () => { selected = $('#sites').value; render(); });
$('#current-site-action').addEventListener('click', () => {
  const exception = mode === 'allow' ? exceptions.find(domain => matchesDomain(currentSite, domain)) : '';
  if (exception) {
    selectedException = exception;
    render();
    $('#exceptions').focus();
  } else if (domains.includes(currentSite)) {
    $('#search').value = '';
    selected = currentSite;
    render();
    $('#sites').focus();
  } else {
    $('#new-domain').value = currentSite;
    updatePreview();
    $('#new-domain').focus();
  }
});
$('#remove').addEventListener('click', async () => {
  const domain = selected;
  selected = '';
  const next = domains.filter(item => item !== domain);
  const nextExceptions = exceptions.filter(child => next.some(parent => child !== parent && child.endsWith(`.${parent}`)));
  if (!await save(next, `${domain} removed.`, nextExceptions)) { selected = domain; render(); }
});
$('#exception-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#exception-domain').value.trim();
  if (exceptions.includes(input.toLowerCase())) { $('#status').textContent = `${input} is already blocked as an exception.`; return; }
  const saved = await save(domains, `${input} blocked under its allowed parent.`, [...exceptions, input]);
  if (saved) {
    $('#exception-domain').value = '';
    try { selectedException = new URL(`https://${input}`).hostname.toLowerCase(); } catch { selectedException = ''; }
    render();
  }
});
$('#exceptions').addEventListener('change', () => { selectedException = $('#exceptions').value; render(); });
$('#remove-exception').addEventListener('click', async () => {
  const domain = selectedException;
  selectedException = '';
  if (!await save(domains, `${domain} exception removed.`, exceptions.filter(item => item !== domain))) { selectedException = domain; render(); }
});
$('#undo').addEventListener('click', async () => {
  if (!undoDomains) return;
  const previous = [...undoDomains];
  const previousExceptions = [...undoExceptions];
  if (await save(previous, 'Last change undone.', previousExceptions)) { undoDomains = null; undoExceptions = null; $('#undo').hidden = true; }
});
$('#lock').addEventListener('click', async () => {
  try { await request({type: 'lock'}); showLocked(true); }
  catch (error) { $('#mode-summary').textContent = error.message; }
});
$('#check-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#check-domain').value.trim();
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error();
    $('#check-result').textContent = `${url.hostname}: ${explain(url.hostname.toLowerCase())}`;
  } catch { $('#check-result').textContent = 'Enter a valid website address or domain.'; }
});
$('#change-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { const result = await request({type: 'changePassword', currentPassword: $('#current-password').value, newPassword: $('#replacement-password').value}); event.target.reset(); setExpiry(result.expiresAt); $('#change-status').textContent = 'Password changed.'; }
  catch (error) { if (/locked/i.test(error.message)) showLocked(true, error.message); else $('#change-status').textContent = error.message; }
});
