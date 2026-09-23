const $ = selector => document.querySelector(selector);
const settings = $('#settings');
const authCard = $('#auth-card');
let mode = 'allow';
let domains = [];
let exceptions = [];
let supportingResources = true;
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
  if (!settings.hidden && !remaining) { showLocked(true, 'Settings locked after five minutes. Enter your parent password to continue.'); return; }
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
  supportingResources = true;
  revision = '';
  undoDomains = null;
  undoExceptions = null;
  currentSite = '';
  selected = '';
  selectedException = '';
  $('#sites').replaceChildren();
  $('#exceptions').replaceChildren();
  $('#supporting-resources').checked = true;
  $('#check-result').textContent = '';
  $('#legacy-backup-list').textContent = '';
  $('#current-site-domain').textContent = '';
  $('#selected-domain').textContent = '';
  $('#change-form').reset();
  $('#password').value = '';
  $('#show-password').checked = false;
  $('#password').type = 'password';
  $('#undo').hidden = true;
  settings.hidden = true;
  authCard.hidden = false;
  $('#access-status').hidden = true;
  $('#setup-panel').hidden = configured;
  $('#unlock-panel').hidden = !configured;
  $('#auth-status').textContent = configured ? (!message || /^Settings are locked\.?$/i.test(message) ? 'Settings are locked. Enter your parent password to continue.' : message) : '';
  $('#setup-status').textContent = configured ? '' : message || '';
  (configured ? $('#password') : $('#new-password')).focus();
}

function explain(host) {
  const match = domains.filter(domain => matchesDomain(host, domain)).sort((a, b) => b.length - a.length)[0];
  if (mode === 'allow') {
    const exception = exceptions.filter(domain => matchesDomain(host, domain)).sort((a, b) => b.length - a.length)[0];
    return exception ? `Blocked because ${exception} is a blocked subdomain.` : match ? `Allowed by ${match}.` : 'Blocked because it is not on your allowed websites list.';
  }
  return match ? `Blocked by ${match}.` : 'Allowed because it is not on your blocked websites list.';
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
  $('#network-panel').hidden = legacy || mode !== 'allow';
  $('#check-panel').hidden = legacy;
  $('#mode-select').value = legacy ? 'allow' : mode;
  $('#apply-mode').disabled = !legacy && $('#mode-select').value === mode;
  $('#mode-summary').textContent = legacy ? 'Your previous version used both lists. Select one rule to continue.' :
    mode === 'allow' ? `Only websites on this list can open. All others are blocked.${exceptions.length ? ` ${exceptions.length} blocked subdomain ${exceptions.length === 1 ? 'exception is' : 'exceptions are'} active.` : ''}` : 'Websites on this list are blocked. All others can open.';
  if (legacy) return;

  $('#list-title').textContent = mode === 'allow' ? 'Allowed websites' : 'Blocked websites';
  $('#list-description').textContent = mode === 'allow' ? 'These websites and their subdomains can open. You can block specific subdomains below.' : 'These websites and their subdomains cannot open.';
  $('#count').textContent = `${domains.length} ${domains.length === 1 ? 'website' : 'websites'}`;
  $('#add-label').textContent = mode === 'allow' ? 'Website to allow' : 'Website to block';
  $('#add').textContent = mode === 'allow' ? 'Allow website' : 'Block website';
  $('#apply-network').disabled = $('#supporting-resources').checked === supportingResources;
  const exceptionList = $('#exceptions');
  exceptionList.replaceChildren();
  exceptionList.size = Math.min(9, Math.max(3, exceptions.length));
  for (const domain of exceptions) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
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
  list.setAttribute('aria-label', mode === 'allow' ? 'Allowed websites' : 'Blocked websites');
  list.size = Math.min(9, Math.max(3, entries.length + 1));
  list.replaceChildren();
  for (const domain of entries) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
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
  $('#match-count').hidden = !query;
  $('#match-count').textContent = query ? `${entries.length} ${entries.length === 1 ? 'result' : 'results'}` : '';
  $('#editor').hidden = !selected;
  if (selected) {
    $('#selected-domain').textContent = selected;
    $('#selected-state').textContent = mode === 'allow' ? 'Allowed' : 'Blocked';
    $('#selected-state').classList.toggle('blocked-state', mode === 'block');
    $('#selected-effect').textContent = `Removing this entry will ${mode === 'allow' ? 'block' : 'allow'} it unless another listed parent domain still applies.`;
  }
  $('#current-site-box').hidden = !currentSite;
  if (currentSite) {
    const exception = mode === 'allow' ? exceptions.find(domain => matchesDomain(currentSite, domain)) : '';
    const listedParent = domains.filter(domain => matchesDomain(currentSite, domain)).sort((a, b) => b.length - a.length)[0];
    $('#current-site-domain').textContent = currentSite;
    $('#current-site-state').textContent = explain(currentSite);
    $('#current-site-action').textContent = exception ? 'View blocked subdomain' : listedParent ? 'View saved rule' : mode === 'allow' ? 'Allow this website' : 'Block this website';
    $('#current-site-action').classList.toggle('secondary', Boolean(exception || listedParent));
  }
  updatePreview();
}

function applyPolicy(result) {
  mode = result.mode;
  domains = [...result.domains];
  exceptions = [...(result.exceptions ?? [])];
  supportingResources = result.supportingResources ?? true;
  $('#supporting-resources').checked = supportingResources;
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
    supportingResources = result.supportingResources ?? true;
    revision = result.revision;
    undoDomains = [...previous];
    undoExceptions = [...previousExceptions];
    $('#undo').hidden = false;
    render();
    $('#status').textContent = `${message} Reload any open website tabs to see the change.`;
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
    $('#apply-network').disabled = $('#supporting-resources').checked === supportingResources;
  }
}

request({type: 'status'}).then(result => result.unlocked ? showSettings() : showLocked(result.configured)).catch(error => showLocked(true, error.message));

document.addEventListener('visibilitychange', async () => {
  if (document.hidden || settings.hidden) return;
  try { if (!(await request({type: 'status'})).unlocked) showLocked(true, 'Settings are locked. Enter your parent password to continue.'); }
  catch { showLocked(true, 'Could not confirm access. Enter your parent password to continue.'); }
});

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === 'session' && changes.accessLockVersion?.newValue) { if (!settings.hidden) showLocked(true); return; }
  if (areaName !== 'session' || !changes.pendingSite?.newValue || settings.hidden) return;
  request({type: 'read'}).then(result => {
    if (result.revision !== revision) { undoDomains = null; undoExceptions = null; $('#undo').hidden = true; }
    currentSite = result.currentSite || '';
    domains = [...result.domains];
    exceptions = [...(result.exceptions ?? [])];
    supportingResources = result.supportingResources ?? true;
    $('#supporting-resources').checked = supportingResources;
    revision = result.revision;
    render();
    setExpiry(result.expiresAt);
  }).catch(error => { if (/locked/i.test(error.message)) showLocked(true, error.message); });
});

$('#setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('#new-password').value !== $('#confirm-password').value) { $('#setup-status').textContent = 'Passwords do not match.'; return; }
  try { await request({type: 'setup', password: $('#new-password').value}); event.target.reset(); await showSettings(); }
  catch (error) { $('#setup-status').textContent = error.message; }
});

$('#show-password').addEventListener('change', () => { $('#password').type = $('#show-password').checked ? 'text' : 'password'; });
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
  const warning = nextMode === 'block' ? 'Block websites on this list? All other websites will be allowed.' : 'Allow only websites on this list? All other websites will be blocked.';
  if (!window.confirm(`${warning}\n\nYour allowed and blocked lists are saved separately.`)) { $('#mode-select').value = mode === 'legacy' ? 'allow' : mode; return; }
  try {
    const result = await request({type: 'setMode', mode: nextMode, revision});
    applyPolicy(result);
    undoDomains = null;
    undoExceptions = null;
    $('#undo').hidden = true;
    $('#status').textContent = `Website rule changed. Reload any open website tabs to see the change. ${result.migrationNotice || ''}`;
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
  const saved = await save([...domains, input], `${input} added to ${mode === 'allow' ? 'allowed' : 'blocked'} websites.`);
  if (saved) {
    $('#new-domain').value = '';
    $('#search').value = '';
    try { selected = new URL(`https://${input}`).hostname.toLowerCase(); } catch { selected = ''; }
    render();
  }
});

$('#search').addEventListener('input', render);
$('#sites').addEventListener('change', () => { selected = $('#sites').value; render(); });
$('#current-site-action').addEventListener('click', async () => {
  const exception = mode === 'allow' ? exceptions.find(domain => matchesDomain(currentSite, domain)) : '';
  const listedParent = domains.filter(domain => matchesDomain(currentSite, domain)).sort((a, b) => b.length - a.length)[0];
  if (exception) {
    selectedException = exception;
    render();
    $('#exceptions').focus();
  } else if (listedParent) {
    $('#search').value = '';
    selected = listedParent;
    render();
    $('#sites').focus();
  } else {
    const host = currentSite;
    const saved = await save([...domains, host], `${host} added to ${mode === 'allow' ? 'allowed' : 'blocked'} websites.`);
    if (saved) { $('#search').value = ''; selected = host; render(); }
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
$('#supporting-resources').addEventListener('change', () => { $('#apply-network').disabled = $('#supporting-resources').checked === supportingResources; });
$('#network-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || mode !== 'allow' || $('#supporting-resources').checked === supportingResources) return;
  busy = true;
  for (const control of settings.querySelectorAll('button,input,select')) control.disabled = true;
  try {
    const result = await request({type: 'setSupporting', enabled: $('#supporting-resources').checked, revision});
    supportingResources = result.supportingResources;
    revision = result.revision;
    undoDomains = null;
    undoExceptions = null;
    $('#undo').hidden = true;
    $('#status').textContent = `${supportingResources ? 'Supporting content allowed' : 'Unlisted supporting content blocked'}. Reload open websites to apply changes.`;
    setExpiry(result.expiresAt);
  } catch (error) {
    if (/locked/i.test(error.message)) showLocked(true, error.message);
    else {
      $('#status').textContent = `Not saved: ${error.message}`;
      if (/another tab/i.test(error.message)) await showSettings();
    }
  } finally {
    busy = false;
    for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
    render();
  }
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
