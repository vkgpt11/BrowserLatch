import {parseDomains} from './policy.mjs';

export function createRulesBackup(policy, savedLists, supportingResources) {
  if (!['allow', 'block'].includes(policy.mode)) throw new Error('Choose a website rule before exporting.');
  return {
    format: 'browselatch-rules', version: 1, mode: policy.mode,
    allowlist: policy.mode === 'allow' ? [...policy.domains] : [...(savedLists.allow ?? [])],
    blocklist: policy.mode === 'block' ? [...policy.domains] : [...(savedLists.block ?? [])],
    blockedSubdomains: policy.mode === 'allow' ? [...policy.exceptions] : [...(savedLists.allowExceptions ?? [])],
    allowSupportingResources: supportingResources
  };
}

export function validateRulesBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.format !== 'browselatch-rules' || value.version !== 1 ||
      !['allow', 'block'].includes(value.mode)) throw new Error('This is not a supported BrowseLatch rules backup.');
  const keys = ['format', 'version', 'mode', 'allowlist', 'blocklist', 'blockedSubdomains', 'allowSupportingResources'];
  if (Object.keys(value).some(key => !keys.includes(key)) ||
      !['allowlist', 'blocklist', 'blockedSubdomains'].every(key => Array.isArray(value[key]) && value[key].every(item => typeof item === 'string')) ||
      typeof value.allowSupportingResources !== 'boolean') throw new Error('The backup contains unexpected or missing information.');
  const allowlist = parseDomains(value.allowlist.join('\n'));
  const blocklist = parseDomains(value.blocklist.join('\n'));
  const blockedSubdomains = parseDomains(value.blockedSubdomains.join('\n'));
  if (blockedSubdomains.some(child => !allowlist.some(parent => child !== parent && child.endsWith(`.${parent}`)))) {
    throw new Error('A blocked subdomain in the backup has no allowed parent website.');
  }
  return {
    format: 'browselatch-rules', version: 1, mode: value.mode,
    allowlist, blocklist, blockedSubdomains,
    allowSupportingResources: value.allowSupportingResources
  };
}
