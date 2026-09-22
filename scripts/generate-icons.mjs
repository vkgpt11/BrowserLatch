import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Resvg} from '@resvg/resvg-js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'assets', 'browselatch-logo.svg'), 'utf8');
for (const size of [16, 32, 48, 128]) {
  const image = new Resvg(source, {fitTo: {mode: 'width', value: size}}).render();
  await writeFile(join(root, 'icons', `icon${size}.png`), image.asPng());
}
const store = new Resvg(source, {fitTo: {mode: 'width', value: 300}}).render();
await writeFile(join(root, 'assets', 'store-logo.png'), store.asPng());
console.log('Generated BrowseLatch icons and Store logo.');
