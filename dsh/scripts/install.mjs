import { existsSync, mkdirSync, cpSync, renameSync, readFileSync, writeFileSync, rmSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** How many replaced skin directories to keep around for manual recovery. */
const KEEP_BACKUPS = 3;
const BACKUP_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Drop all but the newest {@link KEEP_BACKUPS} directories; only our own uuid names are touched. */
function pruneBackups(root) {
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return; }
  const dirs = entries
    .filter(entry => entry.isDirectory() && BACKUP_NAME.test(entry.name))
    .map(entry => ({ path: join(root, entry.name), time: statSync(join(root, entry.name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const stale of dirs.slice(KEEP_BACKUPS)) rmSync(stale.path, { recursive: true, force: true });
}
export function skinHome(env = process.env) {
  return resolve(env.DSH_SKINS_HOME?.trim() || env.DSH_SKINS_DIR?.trim() || join(env.DSH_HOME?.trim() || join(homedir(), '.dsh'), 'skins'));
}
export function installSkin({ source = join(project, 'skins', 'rhine-lab'), target = skinHome(), activate = false } = {}) {
  const manifest = JSON.parse(readFileSync(join(source, 'skin.json'), 'utf8'));
  if (typeof manifest.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(manifest.id)) throw new Error('Invalid skin id: ' + String(manifest.id));
  if (manifest.skinManifestVersion !== 2) throw new Error('Invalid skin manifest');
  for (const path of [manifest.contributes.stylesheet, ...Object.values(manifest.contributes.backgroundMedia ?? {}).map(x => x.src)]) {
    if (isAbsolute(path) || path.split(/[\\/]/).includes('..') || !existsSync(join(source, path))) throw new Error('Invalid skin asset: ' + path);
  }
  mkdirSync(target, { recursive: true });
  const destination = join(target, manifest.id);
  const statePath = join(target, '..', 'skin-center-active.json');
  const previous = activate && existsSync(statePath) ? readFileSync(statePath) : null;
  const state = previous ? JSON.parse(previous.toString('utf8')) : {};
  if (activate && (!state || Array.isArray(state) || typeof state !== 'object')) throw new Error('Invalid existing skin-center state; no files changed');
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) throw new Error('Refusing to replace a linked skin directory');
  if (resolve(source) === resolve(destination)) throw new Error('Source and target must differ');
  const suffix = randomUUID();
  const staged = join(target, '.rhine-lab-stage-' + suffix);
  const backup = join(target, '..', 'rhine-lab-backups', suffix);
  let moved = false;
  try {
    cpSync(source, staged, { recursive: true, dereference: false });
    if (existsSync(destination)) { mkdirSync(dirname(backup),{recursive:true}); renameSync(destination, backup); moved = true; }
    renameSync(staged, destination);
  } catch (error) {
    if (moved && !existsSync(destination)) renameSync(backup, destination);
    throw error;
  } finally { rmSync(staged, { recursive: true, force: true }); }
  if (moved) { try { pruneBackups(join(target, '..', 'rhine-lab-backups')); } catch {} }
  let stateBackup;
  if (activate) {
    // Preserve background controls and any future state fields.
    if (previous) { stateBackup = statePath + '.rhine-backup-' + suffix; writeFileSync(stateBackup, previous, { flag: 'wx' }); }
    const temporary = statePath + '.rhine-stage-' + suffix;
    try {
      writeFileSync(temporary, JSON.stringify({ ...state, active: manifest.id, initialized: true }, null, 2) + '\n', { flag: 'wx' });
      renameSync(temporary, statePath);
    } finally { rmSync(temporary, { force: true }); }
  }
  return { destination, backup: moved ? backup : null, stateBackup };
}
/** Every packaged skin directory that carries a manifest, sorted by id. */
export function listSkins(root = join(project, 'skins')) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, entry.name, 'skin.json')))
    .map(entry => join(root, entry.name))
    .sort();
}
/** Install every packaged skin. Only the first one is selected on a fresh profile. */
export function installAll({ source = join(project, 'skins'), target = skinHome(), activate = false } = {}) {
  const results = [];
  for (const directory of listSkins(source)) {
    results.push(installSkin({ source: directory, target, activate: activate && results.length === 0 }));
  }
  return results;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(x => x !== '--activate')) throw new Error('Usage: node scripts/install.mjs [--activate]');
  console.log(JSON.stringify(installAll({ activate: args.includes('--activate') }), null, 2));
  console.log('Installed. Open DSH Settings > Skin Center and apply a Rhine Lab skin.');
}
