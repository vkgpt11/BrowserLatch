import {publicSuffixRules} from './public-suffix-data.mjs';

const exact = new Set();
const wildcard = new Set();
const exception = new Set();
for (const rule of publicSuffixRules.split('\n')) {
  if (rule.startsWith('!')) exception.add(rule.slice(1));
  else if (rule.startsWith('*.')) wildcard.add(rule.slice(2));
  else exact.add(rule);
}

// Implements the PSL's longest-rule and exception matching for the one question
// this extension needs: would this entry itself be a public suffix?
export function isPublicSuffix(host) {
  const labels = host.toLowerCase().split('.');
  let suffixLength = 1; // The PSL's implicit '*' rule.
  for (let index = 0; index < labels.length; index++) {
    const suffix = labels.slice(index).join('.');
    if (exception.has(suffix)) return false;
    if (exact.has(suffix)) suffixLength = Math.max(suffixLength, labels.length - index);
    if (index > 0 && wildcard.has(suffix)) suffixLength = Math.max(suffixLength, labels.length - index + 1);
  }
  return labels.length === suffixLength;
}
