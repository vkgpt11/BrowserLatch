import {isPublicSuffix} from './public-suffix.mjs';

export function parseDomains(text) {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('Enter a list of at most 500 domains.');
  const domains = new Set();
  for (const entry of text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    // Accept hostnames only: silently discarding a URL path would broaden access.
    if (/[\s/:@?#*\\]/u.test(entry)) throw new Error(`Use a domain only (no URL, path, port or wildcard): ${entry}`);
    let host;
    try { host = new URL(`https://${entry}`).hostname.toLowerCase(); }
    catch { throw new Error(`Invalid domain: ${entry}`); }
    if (host.endsWith('.') || host.length > 253 || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new Error(`Invalid domain: ${entry}`);
    }
    // A public suffix would match unrelated sites beneath it in DNR rules.
    if (isPublicSuffix(host)) throw new Error(`Enter a specific website, not a domain suffix: ${entry}`);
    domains.add(host);
  }
  if (domains.size > 500) throw new Error('The maximum is 500 domains.');
  return [...domains].sort();
}

export function buildRules(domains, mode = 'allow', blockedPageUrl, exceptions = [], allowSupportingResources = true) {
  // DNR otherwise excludes main_frame by default. An empty excludedResourceTypes
  // list is ambiguous across browser versions, so enumerate every supported type.
  const resourceTypes = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
    'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media',
    'websocket', 'webtransport', 'webbundle', 'other'];
  if (!/^chrome-extension:\/\/[^/]+\/blocked\.html$/.test(blockedPageUrl ?? '')) throw new Error('A local blocked-page URL is required.');
  const captureHost = '^https?://([^/:?#]+)(:[0-9]+)?([/?#].*)?$';
  // Keep the complete denied address in the fragment so the parent can return
  // to its path and query after allowing it. The blocked page removes it from
  // its visible address as soon as it loads.
  const redirect = {regexSubstitution: `${blockedPageUrl}?site=\\1#\\0`};
  const rules = [{id: 105, priority: 3, action: {type: 'redirect', redirect},
    condition: {regexFilter: captureHost, resourceTypes: ['main_frame']}}];
  if (!['allow', 'block'].includes(mode)) throw new Error('Choose Allowlist or Blocklist mode.');
  if (typeof allowSupportingResources !== 'boolean') throw new Error('Choose whether supporting resources can load.');
  if (mode === 'block' && exceptions.length) throw new Error('Blocked exceptions only apply in Allowlist mode.');
  if (exceptions.some(child => !domains.some(parent => child !== parent && child.endsWith(`.${parent}`)))) {
    throw new Error('Each blocked exception must be below an allowed parent domain.');
  }
  if (mode === 'block') rules.push({id: 104, priority: 4, action: {type: 'allow'}, condition: {resourceTypes}});
  if (mode === 'allow' && domains.length) rules.push(
    {id: 100, priority: 4, action: {type: 'allow'}, condition: {requestDomains: domains, ...(exceptions.length ? {excludedRequestDomains: exceptions} : {}), resourceTypes}}
  );
  if (mode === 'allow' && domains.length && allowSupportingResources) rules.push(
    // Sites such as YouTube need scripts/video from other hosts. Permit those
    // resources when the initiating page is listed, but keep off-list frames
    // and top-level navigations subject to the default block rules.
    {id: 101, priority: 4, action: {type: 'allow'}, condition: {
      initiatorDomains: domains, ...(exceptions.length ? {excludedInitiatorDomains: exceptions} : {}), resourceTypes: resourceTypes.filter(type => type !== 'main_frame' && type !== 'sub_frame')
    }}
  );
  if (mode === 'allow' && exceptions.length) rules.push({id: 106, priority: 5, action: {type: 'block'},
    condition: {requestDomains: exceptions, resourceTypes: resourceTypes.filter(type => type !== 'main_frame')}});
  if (mode === 'block' && domains.length) rules.push(
    {id: 102, priority: 5, action: {type: 'redirect', redirect},
      condition: {requestDomains: domains, regexFilter: captureHost, resourceTypes: ['main_frame']}},
    {id: 103, priority: 5, action: {type: 'block'},
      condition: {requestDomains: domains, resourceTypes: resourceTypes.filter(type => type !== 'main_frame')}}
  );
  return rules;
}
