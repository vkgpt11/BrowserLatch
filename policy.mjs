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
    domains.add(host);
  }
  if (domains.size > 500) throw new Error('The maximum is 500 domains.');
  return [...domains].sort();
}

export function buildRules(domains) {
  // DNR otherwise excludes main_frame by default. An empty excludedResourceTypes
  // list is ambiguous across browser versions, so enumerate every supported type.
  const resourceTypes = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
    'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media',
    'websocket', 'webtransport', 'webbundle', 'other'];
  if (!domains.length) return [];
  return [
    {id: 100, priority: 3, action: {type: 'allow'}, condition: {requestDomains: domains, resourceTypes}},
    // Sites such as YouTube need scripts/video from other hosts. Permit those
    // resources when the initiating page is listed, but keep off-list frames
    // and top-level navigations subject to the default block rules.
    {id: 101, priority: 3, action: {type: 'allow'}, condition: {
      initiatorDomains: domains, resourceTypes: resourceTypes.filter(type => type !== 'main_frame' && type !== 'sub_frame')
    }}
  ];
}
