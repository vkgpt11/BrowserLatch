import {parseDomains} from './policy.mjs';

export const TEMP_RULE_START = 10000;
export const MAX_TEMP_GRANTS = 20;
export const TEMP_DURATION_MS = 15 * 60 * 1000;
const resourceTypes = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
  'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media',
  'websocket', 'webtransport', 'webbundle', 'other'];

export function exactDomain(value) {
  const domains = parseDomains(value);
  if (domains.length !== 1 || domains[0] !== value.trim().toLowerCase()) throw new Error('Enter one website domain, without a URL or path.');
  return domains[0];
}

export function matchesTemporaryDomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isBlockedByPolicy(host, policy) {
  if (policy.mode === 'allow') return !policy.domains.some(domain => matchesTemporaryDomain(host, domain)) ||
    policy.exceptions.some(domain => matchesTemporaryDomain(host, domain));
  if (policy.mode === 'block') return policy.domains.some(domain => matchesTemporaryDomain(host, domain));
  return false;
}

export function nextTemporarySlot(grants) {
  if (grants.length >= MAX_TEMP_GRANTS) throw new Error('Remove a temporary access entry before adding another.');
  for (let slot = 0; slot < MAX_TEMP_GRANTS; slot++) if (!grants.some(grant => grant.slot === slot)) return slot;
  throw new Error('No temporary access slot is available.');
}

export function temporaryRules(grant) {
  const id = TEMP_RULE_START + grant.slot * 2;
  const tabIds = grant.kind === 'visit' ? {tabIds: [grant.tabId]} : {};
  return [
    {id, priority: 6, action: {type: 'allow'}, condition: {requestDomains: [grant.domain], resourceTypes, ...tabIds}},
    {id: id + 1, priority: 6, action: {type: 'allow'}, condition: {
      initiatorDomains: [grant.domain], resourceTypes: resourceTypes.filter(type => type !== 'main_frame' && type !== 'sub_frame'), ...tabIds
    }}
  ];
}

