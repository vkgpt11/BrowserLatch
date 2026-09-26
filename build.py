"""Create the store upload ZIP without tests or publishing documents."""
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
files = ['manifest.json', 'rules.json', 'background.js', 'policy.mjs', 'auth.mjs',
         'public-suffix.mjs', 'public-suffix-data.mjs', 'PSL-LICENSE',
         'options.html', 'options.js', 'blocked.html', 'blocked.js', 'i18n.js', 'styles.css']
files += list(manifest['icons'].values())
files += [path.relative_to(root).as_posix() for path in (root / '_locales').glob('*/messages.json')]
destination = root / 'dist'
destination.mkdir(exist_ok=True)
archive = destination / f"browselatch-{manifest['version']}.zip"
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in sorted(set(files)):
        bundle.write(root / name, name)
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
print(archive)
