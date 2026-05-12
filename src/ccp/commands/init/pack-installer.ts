import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface InstallPacksOptions {
  sourceRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface PackInstallResult {
  packId: string;
  status: 'installed' | 'skipped' | 'error';
  reason?: string;
}

/** Absolute path to the bundled packs shipped with Agent_OS. */
export function bundledPacksSourceRoot(): string {
  return join(__dirname, 'packs');
}

/**
 * Copy bundled packs from sourceRoot into {targetRoot}/.agent-os/packs/<packId>/.
 *
 * Idempotency: if <packId>/workflow-pack.yaml already exists and force is false,
 * the pack is skipped so user modifications are preserved.
 *
 * Returns [] when sourceRoot does not exist (backward compat — no bundled packs).
 * Never throws — errors are captured per-pack in the result.
 */
export function installBundledPacks(opts: InstallPacksOptions): PackInstallResult[] {
  const { sourceRoot, targetRoot, force = false } = opts;

  if (!existsSync(sourceRoot)) return [];

  let entries: string[];
  try {
    entries = readdirSync(sourceRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const results: PackInstallResult[] = [];
  const packsDir = join(targetRoot, '.agent-os', 'packs');

  for (const packId of entries) {
    const srcDir = join(sourceRoot, packId);
    const dstDir = join(packsDir, packId);
    const manifestDst = join(dstDir, 'workflow-pack.yaml');

    if (!force && existsSync(manifestDst)) {
      results.push({ packId, status: 'skipped', reason: 'already installed' });
      continue;
    }

    try {
      mkdirSync(dstDir, { recursive: true });
      cpSync(srcDir, dstDir, { recursive: true });
      results.push({ packId, status: 'installed' });
    } catch (e) {
      results.push({ packId, status: 'error', reason: (e as Error).message });
    }
  }

  return results;
}
