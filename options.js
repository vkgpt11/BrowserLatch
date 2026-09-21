const $ = selector => document.querySelector(selector);
const authCard = $('#auth-card');
const setupPanel = $('#setup-panel');
const unlockPanel = $('#unlock-panel');
const settings = $('#settings');
const authStatus = $('#auth-status');
let allowed = [];
let blocked = [];
let selected = '';
let busy = false;

async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Could not reach the extension.');
  return result;
}

function showLocked(configured, message = '') {
  settings.hidden = true;
  authCard.hidden = false;
  setupPanel.hidden = configured;
  unlockPanel.hidden = !configured;
  authStatus.textContent = message || (configured ? 'Settings are locked.' : 'Create a password before configuring websites.');
  (configured ? $('#password') : $('#new-password')).focus();
}

function render() {
  const filter = $('#filter').value;
  const list = $('#sites');
  list.replaceChildren();
  const entries = [...allowed.map(domain => ({domain, state: 'Allowed'})),
    ...blocked.map(domain => ({domain, state: 'Blocked'}))]
    .filter(entry => filter === 'all' || entry.state.toLowerCase() === filter)
    .sort((a, b) => a.domain.localeCompare(b.domain));
  for (const entry of entries) {
    const option = document.createElement('option');
    option.value = entry.domain;
    option.textContent = `${entry.state === 'Allowed' ? '✓' : '✕'}  ${entry.domain} — ${entry.state}`;
    option.selected = entry.domain === selected;
    list.append(option);
  }
  if (!entries.length) {
    const empty = document.createElement('option');
    empty.textContent = 'No websites to show';
    empty.disabled = true;
    list.append(empty);
  }
  if (!entries.some(entry => entry.domain === selected)) selected = '';
  list.value = selected;
  $('#count').textContent = `${allowed.length} allowed · ${blocked.length} blocked`;
  const editor = $('#editor');
  editor.hidden = !selected;
  if (selected) {
    const isAllowed = allowed.includes(selected);
    $('#selected-domain').textContent = selected;
    $('#selected-state').textContent = isAllowed ? 'Allowed' : 'Blocked';
    $('#selected-state').classList.toggle('blocked-state', !isAllowed);
    $('#selected-allowed').checked = isAllowed;
  }
}

async function showSettings() {
  const result = await request({type: 'read'});
  allowed = result.allowed;
  blocked = result.blocked;
  selected = '';
  render();
  authCard.hidden = true;
  settings.hidden = false;
  $('#status').textContent = 'Protection is active.';
}

async function save(nextAllowed, nextBlocked, message) {
  if (busy) return;
  busy = true;
  for (const control of settings.querySelectorAll('button,input,select')) control.disabled = true;
  try {
    const result = await request({type: 'save', allowed: nextAllowed.join('\n'), blocked: nextBlocked.join('\n')});
    allowed = result.allowed;
    blocked = result.blocked;
    render();
    $('#status').textContent = `${message} Reload open websites to apply changes.`;
    return true;
  } catch (error) {
    if (/locked/i.test(error.message)) showLocked(true, error.message);
    else $('#status').textContent = `Not saved: ${error.message}`;
    render();
    return false;
  } finally {
    busy = false;
    for (const control of settings.querySelectorAll('button,input,select')) control.disabled = false;
  }
}

request({type: 'status'}).then(result => result.unlocked ? showSettings() : showLocked(result.configured)).catch(error => showLocked(true, error.message));

$('#setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('#new-password').value !== $('#confirm-password').value) { authStatus.textContent = 'Passwords do not match.'; return; }
  try { await request({type: 'setup', password: $('#new-password').value}); event.target.reset(); await showSettings(); }
  catch (error) { authStatus.textContent = error.message; }
});

$('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request({type: 'unlock', password: $('#password').value}); event.target.reset(); await showSettings(); }
  catch (error) { authStatus.textContent = error.message; }
});

$('#add-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#new-domain').value.trim();
  let domain = input.toLowerCase();
  try { domain = new URL(`https://${input}`).hostname.toLowerCase(); } catch {}
  const isAllowed = $('#new-allowed').checked;
  selected = '';
  const saved = await save(
    [...allowed.filter(item => item !== domain), ...(isAllowed ? [input] : [])],
    [...blocked.filter(item => item !== domain), ...(!isAllowed ? [input] : [])],
    `${input} ${isAllowed ? 'allowed' : 'blocked'}.`
  );
  if (saved) {
    $('#new-domain').value = '';
    $('#filter').value = 'all';
    selected = domain;
    render();
  }
});

$('#filter').addEventListener('change', render);
$('#sites').addEventListener('change', () => { selected = $('#sites').value; render(); });
$('#selected-allowed').addEventListener('change', async () => {
  const domain = selected;
  const isAllowed = $('#selected-allowed').checked;
  await save(
    [...allowed.filter(item => item !== domain), ...(isAllowed ? [domain] : [])],
    [...blocked.filter(item => item !== domain), ...(!isAllowed ? [domain] : [])],
    `${domain} ${isAllowed ? 'allowed' : 'blocked'}.`
  );
});
$('#remove').addEventListener('click', async () => {
  const domain = selected;
  selected = '';
  const saved = await save(allowed.filter(item => item !== domain), blocked.filter(item => item !== domain), `${domain} removed.`);
  if (!saved) { selected = domain; render(); }
});
$('#lock').addEventListener('click', async () => {
  try { await request({type: 'lock'}); showLocked(true); }
  catch (error) { $('#status').textContent = error.message; }
});

$('#change-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request({type: 'changePassword', currentPassword: $('#current-password').value, newPassword: $('#replacement-password').value}); event.target.reset(); $('#change-status').textContent = 'Password changed.'; }
  catch (error) { $('#change-status').textContent = error.message; }
});
