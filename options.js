const $ = selector => document.querySelector(selector);
const uiText = value => window.BrowseLatchI18n?.translated(value).trim() ?? value;
const siteText = (source, site) => uiText(source).replace('{site}', site);
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
let pendingReturn = null;
let expiresAt = 0;
let lockTimer;
let undoDomains = null;
let undoExceptions = null;
let busy = false;
let pendingBackup = null;
let diagnosticAction = null;

function hideUndo() { $('#undo').hidden = true; $('#undo-exception').hidden = true; }
const isAccessLockedError = message => /^Settings are locked\.|^Too many attempts\. Settings are temporarily locked\./i.test(message);

const matchesDomain = (host, domain) => host === domain || host.endsWith(`.${domain}`);

function isAllowed(host) {
  const listed = domains.some(domain => matchesDomain(host, domain));
  return mode === 'allow' ? listed && !exceptions.some(domain => matchesDomain(host, domain)) : mode === 'block' && !listed;
}

function receiveCurrentSite(result) {
  currentSite = result.currentSite || '';
  pendingReturn = result.requestedUrl && Number.isSafeInteger(result.requestedTabId)
    ? {url: result.requestedUrl, tabId: result.requestedTabId} : null;
}

async function openRequestedSite(feedback = '#status') {
  if (!pendingReturn || !currentSite || !isAllowed(currentSite)) return;
  const {url, tabId} = pendingReturn;
  let parsed;
  try { parsed = new URL(url); } catch { return; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname.toLowerCase() !== currentSite) return;
  pendingReturn = null;
  try {
    const tab = await chrome.tabs.get(tabId);
    const shown = new URL(tab.url);
    const blocked = new URL(chrome.runtime.getURL('blocked.html'));
    if (shown.origin !== blocked.origin || shown.pathname !== blocked.pathname) throw new Error('Blocked tab was closed or changed.');
    await chrome.tabs.update(tabId, {url: parsed.href});
    $(feedback).textContent = 'Saved. Opening the requested website.';
  } catch {
    $(feedback).textContent = 'Saved. Return to the website and reload it.';
  }
}

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
  pendingReturn = null;
  selected = '';
  selectedException = '';
  $('#sites').replaceChildren();
  $('#exceptions').replaceChildren();
  $('#supporting-resources').checked = true;
  $('#status').textContent = '';
  $('#check-result').textContent = '';
  $('#diagnosis').textContent = '';
  $('#diagnosis-results').hidden = true;
  $('#diagnostic-action').hidden = true;
  diagnosticAction = null;
  $('#check-form').reset();
  $('#related-box').hidden = true;
  $('#exception-status').textContent = '';
  $('#network-status').textContent = '';
  $('#legacy-backup-list').textContent = '';
  $('#backup-status').textContent = '';
  $('#import-preview').textContent = '';
  $('#import-preview').hidden = true;
  $('#import-file').value = '';
  $('#import-rules').disabled = true;
  pendingBackup = null;
  $('#current-site-domain').textContent = '';
  $('#change-form').reset();
  $('#guide-form').reset();
  $('#guide-outcome').textContent = '';
  $('#guide-outcome').hidden = true;
  $('#guide-status').textContent = '';
  $('#password').value = '';
  $('#show-password').checked = false;
  $('#password').type = 'password';
  hideUndo();
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

const matchingDomain = (host, list) => list.filter(domain => matchesDomain(host, domain)).sort((a, b) => b.length - a.length)[0];

function websiteHost(input) {
  const url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid website address.');
  return url.hostname.toLowerCase();
}

function blockedAction(host, fromAnotherWebsite = false) {
  if (mode === 'allow') {
    const exception = matchingDomain(host, exceptions);
    return exception ? {type: 'removeException', domain: exception} : {type: 'add', domain: host, fromAnotherWebsite};
  }
  return {type: 'remove', domain: matchingDomain(host, domains)};
}

function setDiagnosticAction(action) {
  diagnosticAction = action;
  const button = $('#diagnostic-action');
  button.hidden = !action;
  if (action) button.textContent = action.type === 'add' ? siteText('Allow {site}', action.domain) :
    action.type === 'reviewSupporting' ? uiText('Review content setting') : siteText('Remove block for {site}', action.domain);
}

function showCheckResult() {
  const input = $('#check-domain').value.trim();
  $('#diagnosis-results').hidden = false;
  setDiagnosticAction(null);
  try {
    const host = websiteHost(input);
    $('#check-result').textContent = `${host}: ${explain(host)}`;
    if (!isAllowed(host)) {
      $('#diagnosis').textContent = 'The main website is blocked by BrowseLatch. Allow it before checking sign-in or other content.';
      setDiagnosticAction(blockedAction(host));
      return;
    }
    const kind = $('#problem-kind').value;
    if (kind === 'page') {
      $('#diagnosis').textContent = 'BrowseLatch allows the main website. If it still does not open, the cause may be outside these website rules.';
      return;
    }
    const otherInput = $('#related-domain').value.trim();
    if (!otherInput) {
      if (kind === 'frame') $('#diagnosis').textContent = 'The main website can open. An embedded sign-in or payment page may use another website. Enter that domain above if you know it. BrowseLatch cannot identify it from this page alone.';
      else if (mode === 'allow' && !supportingResources) {
        $('#diagnosis').textContent = 'The main website can open, but content from unlisted websites is blocked. Review the content setting, or enter a content domain to check it.';
        setDiagnosticAction({type: 'reviewSupporting'});
      } else $('#diagnosis').textContent = 'The main website can open. Enter the domain used by the missing content if you know it; BrowseLatch cannot identify it from this page alone.';
      return;
    }
    let other;
    try { other = websiteHost(otherInput); }
    catch { $('#diagnosis').textContent = 'Enter a valid other website address or domain.'; return; }
    if (kind === 'frame') {
      if (isAllowed(other)) $('#diagnosis').textContent = siteText('Under these rules, {site} can open in the sign-in or payment box. The problem may have another cause.', other);
      else {
        $('#diagnosis').textContent = siteText('{site} is blocked in the sign-in or payment box. Allowing it also permits direct visits.', other);
        setDiagnosticAction(blockedAction(other, true));
      }
      return;
    }
    const explicitlyBlocked = mode === 'allow' ? matchingDomain(other, exceptions) : matchingDomain(other, domains);
    if (explicitlyBlocked) {
      $('#diagnosis').textContent = siteText('Content from {site} is blocked. Removing this block also affects its subdomains.', other);
      setDiagnosticAction(blockedAction(other, true));
    } else if (mode === 'allow' && !isAllowed(other) && !supportingResources) {
      $('#diagnosis').textContent = siteText('Content from {site} is blocked by the content setting. Allowing this site also permits direct visits.', other);
      setDiagnosticAction(blockedAction(other, true));
    } else $('#diagnosis').textContent = siteText('Content from {site} is allowed under these rules. The problem may have another cause.', other);
  } catch { $('#check-result').textContent = 'Enter a valid website address or domain.'; $('#diagnosis').textContent = ''; }
}

function refreshCheckResult() {
  if ($('#check-result').textContent) showCheckResult();
}

function clearDiagnosis() {
  $('#check-result').textContent = '';
  $('#diagnosis').textContent = '';
  $('#diagnosis-results').hidden = true;
  setDiagnosticAction(null);
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
  exceptionList.hidden = !exceptions.length;
  $('#exceptions-empty').hidden = Boolean(exceptions.length);
  $('#remove-exception').hidden = !exceptions.length;
  exceptionList.size = Math.min(9, Math.max(2, exceptions.length + 1));
  for (const domain of exceptions) {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    option.selected = domain === selectedException;
    exceptionList.append(option);
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
  $('#remove').disabled = !selected;
  $('#remove').setAttribute('aria-label', selected ? `Remove ${selected} from ${mode === 'allow' ? 'allowed' : 'blocked'} websites` : 'Remove selected website');
  $('#current-site-box').hidden = !currentSite;
  if (currentSite) {
    const exception = mode === 'allow' ? exceptions.find(domain => matchesDomain(currentSite, domain)) : '';
    const listedParent = domains.filter(domain => matchesDomain(currentSite, domain)).sort((a, b) => b.length - a.length)[0];
    $('#current-site-domain').textContent = currentSite;
    $('#current-site-state').textContent = explain(currentSite);
    $('#current-site-action').textContent = exception ? 'View blocked subdomain' : listedParent ? 'View saved rule' : mode === 'allow' ? pendingReturn ? 'Allow and open website' : 'Allow this website' : 'Block this website';
    $('#current-site-action').classList.toggle('secondary', Boolean(exception || listedParent));
  }
  updatePreview();
}

function applyPolicy(result) {
  mode = result.mode;
  $('#mode-select').value = mode === 'legacy' ? 'allow' : mode;
  domains = [...result.domains];
  exceptions = [...(result.exceptions ?? [])];
  supportingResources = result.supportingResources ?? true;
  $('#supporting-resources').checked = supportingResources;
  revision = result.revision;
  undoDomains = null;
  undoExceptions = null;
  hideUndo();
  $('#status').textContent = '';
  $('#exception-status').textContent = '';
  $('#network-status').textContent = '';
  receiveCurrentSite(result);
  selected = '';
  selectedException = '';
  if (mode === 'legacy') $('#legacy-counts').textContent = `${result.legacyAllowed.length} previously allowed · ${result.legacyBlocked.length} previously blocked`;
  $('#legacy-backup').hidden = !result.legacyAllowedBackup?.length;
  $('#legacy-backup-list').textContent = (result.legacyAllowedBackup ?? []).join('\n');
  render();
  refreshCheckResult();
  $('#guide-panel').hidden = !result.guidedSetupPending;
  $('#main-settings').hidden = Boolean(result.guidedSetupPending);
  if (result.guidedSetupPending && currentSite && !$('#guide-domain').value) $('#guide-domain').value = currentSite;
  if (result.guidedSetupPending) updateGuideOutcome();
  authCard.hidden = true;
  settings.hidden = false;
  $('#access-status').hidden = false;
  setExpiry(result.expiresAt);
}

async function showSettings() { applyPolicy(await request({type: 'read'})); }

async function reportSaveError(error, feedback) {
  if (isAccessLockedError(error.message)) { showLocked(true, error.message); return; }
  if (/another tab/i.test(error.message)) {
    try { await showSettings(); }
    catch (refreshError) {
      if (isAccessLockedError(refreshError.message)) { showLocked(true, refreshError.message); return; }
      $(feedback).textContent = `Not saved: ${error.message} Could not refresh settings: ${refreshError.message}`;
      return;
    }
  }
  $(feedback).textContent = `Not saved: ${error.message}`;
}

async function save(next, message, nextExceptions = exceptions, previous = domains, previousExceptions = exceptions, feedback = '#status') {
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
    hideUndo();
    $(feedback === '#exception-status' ? '#undo-exception' : '#undo').hidden = false;
    render();
    $('#status').textContent = '';
    $('#exception-status').textContent = '';
    $(feedback).textContent = `${message} Reload any open website tabs to see the change.`;
    refreshCheckResult();
    setExpiry(result.expiresAt);
    await openRequestedSite(feedback);
    return true;
  } catch (error) {
    await reportSaveError(error, feedback);
    if (!settings.hidden) render();
    return false;
  } finally {
    busy = false;
    for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
    $('#apply-mode').disabled = mode !== 'legacy' && $('#mode-select').value === mode;
    $('#remove').disabled = !selected;
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
    if (result.revision !== revision) { undoDomains = null; undoExceptions = null; hideUndo(); }
    receiveCurrentSite(result);
    domains = [...result.domains];
    exceptions = [...(result.exceptions ?? [])];
    supportingResources = result.supportingResources ?? true;
    $('#supporting-resources').checked = supportingResources;
    revision = result.revision;
    render();
    refreshCheckResult();
    setExpiry(result.expiresAt);
  }).catch(error => { if (isAccessLockedError(error.message)) showLocked(true, error.message); });
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
function updateGuideOutcome() {
  const choice = document.querySelector('input[name="guide-mode"]:checked')?.value;
  const domain = $('#guide-domain').value.trim();
  $('#guide-outcome').hidden = !choice;
  if (!choice) return;
  $('#guide-outcome').textContent = choice === 'allow'
    ? domain ? `Only ${domain} and its subdomains can open. Other websites are blocked.` : 'No websites will open until you add one.'
    : domain ? `${domain} and its subdomains will be blocked. Other websites can open.` : 'All websites can open until you add one to the block list.';
}
for (const choice of document.querySelectorAll('input[name="guide-mode"]')) choice.addEventListener('change', updateGuideOutcome);
$('#guide-domain').addEventListener('input', updateGuideOutcome);
$('#guide-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const choice = document.querySelector('input[name="guide-mode"]:checked')?.value;
  if (!choice) { $('#guide-status').textContent = 'Choose one website rule to continue.'; return; }
  busy = true;
  for (const control of $('#guide-form').querySelectorAll('button,input')) control.disabled = true;
  try {
    const result = await request({type: 'completeSetup', mode: choice, domain: $('#guide-domain').value.trim(), revision});
    const site = currentSite;
    const returnTo = pendingReturn;
    applyPolicy(result);
    currentSite = site;
    pendingReturn = returnTo;
    render();
    $('#status').textContent = 'Setup complete. You can add more websites below.';
    $('#new-domain').focus();
    await openRequestedSite();
  } catch (error) {
    if (isAccessLockedError(error.message)) showLocked(true, error.message);
    else $('#guide-status').textContent = `Setup not saved: ${error.message}`;
  } finally {
    busy = false;
    for (const control of $('#guide-form').querySelectorAll('button,input')) control.disabled = false;
  }
});
$('#mode-form').addEventListener('submit', async event => {
  event.preventDefault();
  const nextMode = $('#mode-select').value;
  if (nextMode === mode) return;
  const warning = nextMode === 'block' ? 'Block websites on this list? All other websites will be allowed.' : 'Allow only websites on this list? All other websites will be blocked.';
  if (!window.confirm(`${uiText(warning)}\n\n${uiText('Your allowed and blocked lists are saved separately.')}`)) { $('#mode-select').value = mode === 'legacy' ? 'allow' : mode; return; }
  try {
    const result = await request({type: 'setMode', mode: nextMode, revision});
    const site = currentSite;
    const returnTo = pendingReturn;
    applyPolicy(result);
    currentSite = site;
    pendingReturn = returnTo;
    render();
    undoDomains = null;
    undoExceptions = null;
    hideUndo();
    $('#status').textContent = `Website rule changed. Reload any open website tabs to see the change. ${result.migrationNotice || ''}`;
    await openRequestedSite();
  } catch (error) {
    if (isAccessLockedError(error.message)) showLocked(true, error.message);
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
  if (exceptions.includes(input.toLowerCase())) { $('#exception-status').textContent = `${input} is already blocked.`; return; }
  const saved = await save(domains, `${input} is now blocked.`, [...exceptions, input], domains, exceptions, '#exception-status');
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
  if (!await save(domains, `${domain} is no longer blocked as part of an allowed website.`, exceptions.filter(item => item !== domain), domains, exceptions, '#exception-status')) { selectedException = domain; render(); }
});
$('#supporting-resources').addEventListener('change', () => {
  const changed = $('#supporting-resources').checked !== supportingResources;
  $('#apply-network').disabled = !changed;
  $('#network-status').textContent = changed ? 'Select Save change to apply this setting.' : '';
});
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
    hideUndo();
    $('#network-status').textContent = `${supportingResources ? 'Extra content is allowed' : 'Extra content from other websites is blocked'}. Reload any open website tabs to see the change.`;
    refreshCheckResult();
    setExpiry(result.expiresAt);
  } catch (error) {
    await reportSaveError(error, '#network-status');
  } finally {
    busy = false;
    for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
    render();
  }
});
async function undoLastChange(feedback) {
  if (!undoDomains) return;
  const previous = [...undoDomains];
  const previousExceptions = [...undoExceptions];
  if (await save(previous, 'Last change undone.', previousExceptions, domains, exceptions, feedback)) { undoDomains = null; undoExceptions = null; hideUndo(); }
}
$('#undo').addEventListener('click', () => undoLastChange('#status'));
$('#undo-exception').addEventListener('click', () => undoLastChange('#exception-status'));
$('#lock').addEventListener('click', async () => {
  try { await request({type: 'lock'}); showLocked(true); }
  catch (error) { $('#mode-summary').textContent = error.message; }
});
$('#check-form').addEventListener('submit', event => {
  event.preventDefault();
  showCheckResult();
});
$('#check-domain').addEventListener('input', clearDiagnosis);
$('#related-domain').addEventListener('input', clearDiagnosis);
$('#problem-kind').addEventListener('change', () => {
  $('#related-box').hidden = $('#problem-kind').value === 'page';
  clearDiagnosis();
});
$('#language').addEventListener('change', () => {
  if ($('#check-result').textContent) queueMicrotask(showCheckResult);
});
$('#diagnostic-action').addEventListener('click', async () => {
  const action = diagnosticAction;
  if (!action || busy) return;
  if (action.type === 'reviewSupporting') {
    $('#network-panel').scrollIntoView?.({behavior: 'smooth', block: 'center'});
    $('#supporting-resources').focus();
    return;
  }
  const {domain} = action;
  if (action.type === 'add') {
    if (!window.confirm(siteText('Allow {site} and its subdomains? This also allows direct visits.', domain))) return;
    if (!await save([...domains, domain], `${domain} added to allowed websites.`) && !settings.hidden) $('#diagnosis').textContent = $('#status').textContent;
  } else if (action.type === 'removeException') {
    if (!window.confirm(siteText('Remove the block for {site} and its subdomains?', domain))) return;
    if (!await save(domains, `${domain} is no longer blocked.`, exceptions.filter(item => item !== domain), domains, exceptions, '#exception-status') && !settings.hidden) $('#diagnosis').textContent = $('#exception-status').textContent;
  } else if (action.type === 'remove') {
    if (!window.confirm(siteText('Remove {site} from blocked websites? This also affects its subdomains.', domain))) return;
    if (!await save(domains.filter(item => item !== domain), `${domain} removed from blocked websites.`) && !settings.hidden) $('#diagnosis').textContent = $('#status').textContent;
  }
});
$('#export-rules').addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  $('#export-rules').disabled = true;
  try {
    const result = await request({type: 'exportBackup'});
    const file = new Blob([`${JSON.stringify(result.backup, null, 2)}\n`], {type: 'application/json'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `browselatch-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#backup-status').textContent = 'Backup downloaded. Keep the file somewhere private.';
    setExpiry(result.expiresAt);
  } catch (error) {
    if (isAccessLockedError(error.message)) showLocked(true, error.message);
    else $('#backup-status').textContent = `Backup not downloaded: ${error.message}`;
  } finally { busy = false; $('#export-rules').disabled = false; }
});
$('#import-file').addEventListener('change', async () => {
  pendingBackup = null;
  $('#import-rules').disabled = true;
  $('#import-preview').hidden = true;
  $('#import-preview').textContent = '';
  $('#backup-status').textContent = '';
  const file = $('#import-file').files?.[0];
  if (!file) return;
  if (file.size > 500000) { $('#backup-status').textContent = 'Backup file is too large.'; return; }
  try {
    const backup = JSON.parse(await file.text());
    const result = await request({type: 'inspectBackup', backup});
    pendingBackup = result.backup;
    $('#import-preview').textContent = `Ready to replace your rules: ${pendingBackup.allowlist.length} allowed, ${pendingBackup.blocklist.length} blocked. Active rule: ${pendingBackup.mode === 'allow' ? 'Allowlist' : 'Blocklist'}.`;
    $('#import-preview').hidden = false;
    $('#import-rules').disabled = false;
    setExpiry(result.expiresAt);
  } catch (error) {
    if (isAccessLockedError(error.message)) showLocked(true, error.message);
    else $('#backup-status').textContent = `Cannot use this backup: ${error.message}`;
  }
});
$('#import-rules').addEventListener('click', async () => {
  if (busy || !pendingBackup) return;
  if (!window.confirm(uiText('Replace both website lists and the content setting with this backup? Your password on this browser will stay the same.'))) return;
  busy = true;
  for (const control of settings.querySelectorAll('button,input,select')) control.disabled = true;
  try {
    const result = await request({type: 'importBackup', backup: pendingBackup, revision});
    applyPolicy(result);
    pendingBackup = null;
    $('#import-file').value = '';
    $('#import-rules').disabled = true;
    $('#import-preview').hidden = true;
    $('#backup-status').textContent = 'Website rules restored. Your parent password was not changed. Reload open website tabs to apply the rules.';
  } catch (error) {
    await reportSaveError(error, '#backup-status');
  } finally {
    busy = false;
    if (!settings.hidden) {
      for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
      $('#import-rules').disabled = !pendingBackup;
      render();
    }
  }
});
$('#change-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { const result = await request({type: 'changePassword', currentPassword: $('#current-password').value, newPassword: $('#replacement-password').value}); event.target.reset(); setExpiry(result.expiresAt); $('#change-status').textContent = 'Password changed.'; }
  catch (error) { if (isAccessLockedError(error.message)) showLocked(true, error.message); else $('#change-status').textContent = error.message; }
});
