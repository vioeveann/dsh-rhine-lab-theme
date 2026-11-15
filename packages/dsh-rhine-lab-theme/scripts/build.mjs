import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { zipSync } from 'fflate';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = {};
function collect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) collect(abs);
    else if (entry.isFile()) files[relative(root, abs).replaceAll('\\', '/')] = new Uint8Array(readFileSync(abs));
  }
}
// The packaged file list follows package.json#files, so adding a file to the
// manifest is enough to get it into the source and skin archives.
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const entry of [...manifest.files, 'package.json', 'package-lock.json', 'tests']) {
  const abs = join(root, entry);
  if (!existsSync(abs)) { console.warn('Skipping missing entry: ' + entry); continue; }
  if (statSync(abs).isDirectory()) collect(abs);
  else files[entry.replaceAll('\\', '/')] = new Uint8Array(readFileSync(abs));
}
const dist = join(root, 'dist'); mkdirSync(dist, { recursive: true });
const version = JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
const sourceName = 'Rhine-Lab-DSH-Theme-' + version + '-Source.zip';
const skinName = 'Rhine-Lab-DSH-Theme-' + version + '-Skin.zip';
if (!process.env.npm_execpath) throw new Error('Run npm run build to package the installable plugin');
const packed = spawnSync(process.execPath,[process.env.npm_execpath,'pack','--ignore-scripts','--pack-destination',dist],{cwd:root,encoding:'utf8'});
if(packed.status!==0) throw new Error(packed.stderr || 'npm pack failed');
const pluginName = JSON.parse(readFileSync(join(root,'package.json'),'utf8')).name + '-' + version + '.tgz';
writeFileSync(join(dist, sourceName), zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => ['Rhine-Lab-DSH-Theme/' + k, v])), { level: 9 }));
const skin = Object.fromEntries(Object.entries(files).filter(([k]) => /^skins\/[^/]+\//.test(k)).map(([k,v]) => [k.slice('skins/'.length),v]));
writeFileSync(join(dist, skinName), zipSync(skin, { level: 9 }));
writeFileSync(join(dist, 'SHA256SUMS.txt'), [pluginName, skinName, sourceName].map(name => createHash('sha256').update(readFileSync(join(dist,name))).digest('hex') + '  ' + name).join('\n') + '\n');
console.log('Built installable plugin, skin and source packages in ' + dist);
