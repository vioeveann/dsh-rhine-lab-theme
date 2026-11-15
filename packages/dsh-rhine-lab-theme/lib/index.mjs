import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { installSkin, listSkins, skinHome } from '../scripts/install.mjs';

export const name = 'rhine-lab-rebuild';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function assetHash(directory) {
  const hash = createHash('sha256');
  function walk(path, relative = '') {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      if (entry.isSymbolicLink()) throw new Error('Linked artwork is not supported');
      const key = relative + entry.name;
      if (entry.isDirectory()) walk(join(path, entry.name), key + '/');
      else if (entry.isFile()) hash.update(key).update('\0').update(readFileSync(join(path, entry.name))).update('\0');
    }
  }
  walk(directory);
  return hash.digest('hex');
}

/**
 * Install every packaged skin once per content digest.
 *
 * A skin directory the user has edited on disk is never overwritten: an updated
 * package replaces only directories that still match the digest the plugin
 * installed last time. Delete the directory (or the marker) to force a reinstall.
 * @param options - target skins directory, an optional single source directory, and the packaged skins root.
 * @returns what was installed, whether a skin was selected, and any kept local edits.
 */
export function prepareTheme({ target = skinHome(), source, skinsRoot = join(project, 'skins') } = {}) {
  const markerPath = join(target, '..', 'rhine-lab-plugin.json');
  // A truncated or hand-edited marker must not block the theme: move it aside
  // and treat this run as a first install.
  let previous = null;
  if (existsSync(markerPath)) {
    try {
      const parsed = JSON.parse(readFileSync(markerPath, 'utf8'));
      previous = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch { previous = null; }
    if (previous === null) {
      try { renameSync(markerPath, markerPath + '.corrupt-' + Date.now()); } catch {}
    }
  }
  const version = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
  const records = previous?.skins && typeof previous.skins === 'object' && !Array.isArray(previous.skins) ? { ...previous.skins } : {};
  // A marker written before multi-skin support described the primary skin only.
  if (!records['rhine-lab'] && typeof previous?.digest === 'string') records['rhine-lab'] = previous.digest;
  const firstInstall = previous === null;
  let installed = false;
  let activated = false;
  let last = null;
  const kept = [];
  for (const directory of (source ? [source] : listSkins(skinsRoot))) {
    const id = JSON.parse(readFileSync(join(directory, 'skin.json'), 'utf8')).id;
    const destination = join(target, id);
    const sourceDigest = assetHash(directory);
    let install;
    if (!existsSync(destination)) install = true;
    else if (records[id] === sourceDigest) install = false;
    else {
      const installedDigest = assetHash(destination);
      if (installedDigest === sourceDigest) install = false;
      else if (records[id] && installedDigest === records[id]) install = true;
      else { kept.push(id); continue; }
    }
    if (install) {
      const select = firstInstall && !activated;
      last = installSkin({ source: directory, target, activate: select });
      activated = activated || select;
      installed = true;
    }
    records[id] = sourceDigest;
  }
  const migrated = previous !== null && previous.skins === undefined;
  if (previous === null || installed || kept.length > 0 || migrated) {
    const temporary = markerPath + '.' + randomUUID() + '.tmp';
    const digest = records['rhine-lab'] ?? assetHash(skinsRoot);
    writeFileSync(temporary, JSON.stringify({ version, digest, skins: records }, null, 2) + '\n', { flag: 'wx' });
    renameSync(temporary, markerPath);
  }
  if (kept.length > 0) console.warn('[rhine-lab-rebuild] Kept locally edited skin(s): ' + kept.join(', ') + '. Delete the skin directory under ' + target + ' to take the packaged copy.');
  if (!installed) return kept.length > 0 ? { installed: false, activated: false, kept } : { installed: false, activated: false };
  return { ...last, installed: true, activated, kept };
}

export function apply() {
  const result = prepareTheme();
  if (result.installed) console.info('[rhine-lab-rebuild] Artwork installed' + (result.activated ? ' and selected' : ''));
  if (result.kept?.length) console.info('[rhine-lab-rebuild] Local artwork kept for: ' + result.kept.join(', '));
}
