// Refresh the bundled Public Suffix List data. This is a development-only step;
// the extension never downloads rules while it is running.
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';

const source = 'https://publicsuffix.org/list/public_suffix_list.dat';
const response = await fetch(source);
if (!response.ok) throw new Error(`Could not download the Public Suffix List: ${response.status}`);
const raw = await response.text();
if (!raw.includes('BEGIN ICANN DOMAINS') || !raw.includes('BEGIN PRIVATE DOMAINS')) throw new Error('Unexpected Public Suffix List format.');

const rules = [];
for (const rawLine of raw.replace(/^\uFEFF/, '').split(/\r?\n/)) {
  const entry = rawLine.trim().split(/\s+/u)[0];
  if (!entry || entry.startsWith('//')) continue;
  const prefix = entry.startsWith('!') ? '!' : entry.startsWith('*.') ? '*.' : '';
  const domain = entry.slice(prefix.length);
  const ascii = new URL(`https://${domain}`).hostname.toLowerCase();
  if (!ascii || ascii.endsWith('.')) throw new Error(`Unexpected suffix rule: ${entry}`);
  rules.push(prefix + ascii);
}
if (rules.length < 5000) throw new Error('Downloaded suffix list is unexpectedly short.');

const digest = createHash('sha256').update(raw).digest('hex');
const generated = `// Generated from ${source}\n// Source SHA-256: ${digest}\n// Includes ICANN and PRIVATE rules. Update with: node scripts/update-psl.mjs\nexport const publicSuffixRules = ${JSON.stringify(rules.join('\n'))};\n`;
const licenseResponse = await fetch('https://raw.githubusercontent.com/publicsuffix/list/main/LICENSE');
if (!licenseResponse.ok) throw new Error(`Could not download the PSL license: ${licenseResponse.status}`);
const license = await licenseResponse.text();
await Promise.all([
  writeFile(new URL('../public-suffix-data.mjs', import.meta.url), generated),
  writeFile(new URL('../PSL-LICENSE', import.meta.url), license)
]);
console.log(`Bundled ${rules.length} Public Suffix List rules (${digest.slice(0, 12)}).`);
