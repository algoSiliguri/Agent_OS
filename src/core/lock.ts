import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { readEvents } from './event-log';
import { loadProjectConfig } from './manifest';
import { writeJsonAtomic } from './session-store';

export const LockRecord = Type.Object({
  session_id: Type.String(),
  project_id: Type.String(),
  repo_root: Type.String(),
  log_path: Type.String(),
});
export type LockRecord = Static<typeof LockRecord>;

export function writeLock(path: string, record: LockRecord): void {
  writeJsonAtomic(path, record);
}

export function readLock(path: string): LockRecord {
  const obj = JSON.parse(readFileSync(path, 'utf-8'));
  if (!Value.Check(LockRecord, obj)) {
    throw new Error('invalid lock file');
  }
  return obj;
}

export async function validateLock(
  record: LockRecord,
  opts: { repoRoot: string },
): Promise<[boolean, string]> {
  if (record.repo_root !== opts.repoRoot) return [false, 'repo_mismatch'];
  const events = readEvents(record.log_path);
  if (!events.some((e) => e.session_id === record.session_id)) {
    return [false, 'session_not_found'];
  }
  const config = loadProjectConfig(join(opts.repoRoot, '.agent-os', 'project.yaml'));
  if (config.project_id !== record.project_id) return [false, 'project_mismatch'];
  return [true, 'ok'];
}
