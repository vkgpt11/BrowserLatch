import {parseDomains} from './policy.mjs';

export function createRulesBackup(policy, savedLists, strictContentSites = []) {
  if (!['allow', 'block'].includes(policy.mode)) throw new Error('Choose a website rule before exporting.');
  const allowlist = policy.mode === 'allow' ? [...policy.domains] : [...(savedLists.allow ?? [])];
  if (typeof strictContentSites === 'boolean') strictContentSites = strictContentSites ? [] : allowlist;
  return {
    format: 'browselatch-rules', version: 2, mode: policy.mode,
    allowlist,
    blocklist: policy.mode === 'block' ? [...policy.domains] : [...(savedLists.block ?? [])],
    blockedSubdomains: policy.mode === 'allow' ? [...policy.exceptions] : [...(savedLists.allowExceptions ?? [])],
    strictContentSites: [...strictContentSites]
  };
}

export function validateRulesBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.format !== 'browselatch-rules' || ![1, 2].includes(value.version) ||
      !['allow', 'block'].includes(value.mode)) throw new Error('This is not a supported BrowseLatch rules backup.');
  const keys = ['format', 'version', 'mode', 'allowlist', 'blocklist', 'blockedSubdomains',
    value.version === 1 ? 'allowSupportingResources' : 'strictContentSites'];
  if (Object.keys(value).some(key => !keys.includes(key)) ||
      !['allowlist', 'blocklist', 'blockedSubdomains'].every(key => Array.isArray(value[key]) && value[key].every(item => typeof item === 'string')) ||
      (value.version === 1 ? typeof value.allowSupportingResources !== 'boolean' :
        !Array.isArray(value.strictContentSites) || !value.strictContentSites.every(item => typeof item === 'string'))) {
    throw new Error('The backup contains unexpected or missing information.');
  }
  const allowlist = parseDomains(value.allowlist.join('\n'));
  const blocklist = parseDomains(value.blocklist.join('\n'));
  const blockedSubdomains = parseDomains(value.blockedSubdomains.join('\n'));
  if (blockedSubdomains.some(child => !allowlist.some(parent => child !== parent && child.endsWith(`.${parent}`)))) {
    throw new Error('A blocked subdomain in the backup has no allowed parent website.');
  }
  const strictContentSites = value.version === 1
    ? value.allowSupportingResources ? [] : [...allowlist]
    : parseDomains(value.strictContentSites.join('\n'));
  if (strictContentSites.some(site => !allowlist.includes(site))) throw new Error('A content choice has no allowed website.');
  return {
    format: 'browselatch-rules', version: 2, mode: value.mode,
    allowlist, blocklist, blockedSubdomains, strictContentSites
  };
}
