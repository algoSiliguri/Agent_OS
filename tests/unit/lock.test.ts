import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { LockRecord, readLock, validateLock, writeLock } from '../../src/core/lock';

describe('LockRecord schema', () => {
  it('accepts a valid record', () => {
    const valid = {
      session_id: 'sess-1',
      project_id: 'demo',
      repo_root: '/repo',
      log_path: '/repo/.agent-os/runtime/events.jsonl',
    };
    expect(Value.Check(LockRecord, valid)).toBe(true);
  });

  it('rejects a record missing required fields', () => {
    expect(Value.Check(LockRecord, { session_id: 'sess-1' })).toBe(false);
  });

  it('rejects non-string field types', () => {
    const bad = {
      session_id: 'sess-1',
      project_id: 'demo',
      repo_root: 123,
      log_path: '/x',
    };
    expect(Value.Check(LockRecord, bad)).toBe(false);
  });
});

describe('lock I/O', () => {
  it('round-trips a LockRecord via atomic JSON write', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-'));
    const path = join(dir, '.agent-os.lock');
    const record = {
      session_id: 'sess-1',
      project_id: 'demo',
      repo_root: dir,
      log_path: join(dir, 'events.jsonl'),
    };
    writeLock(path, record);
    expect(readLock(path)).toEqual(record);
  });

  it('readLock throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-'));
    const path = join(dir, '.agent-os.lock');
    writeFileSync(path, '{not json}', 'utf-8');
    expect(() => readLock(path)).toThrow();
  });
});

describe('validateLock', () => {
  it('rejects repo_mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-v-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      'project_id: demo\ndomain_type: d\nruntime_version: 0.1.0\nmemory_namespace: demo\nverification_profile: default\nworkspace:\n  root: .\n',
    );
    const record = {
      session_id: 'sess-1',
      project_id: 'demo',
      repo_root: '/different',
      log_path: join(dir, 'events.jsonl'),
    };
    const result = await validateLock(record, { repoRoot: dir });
    expect(result).toEqual([false, 'repo_mismatch']);
  });

  it('rejects project_mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-v-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      'project_id: real\ndomain_type: d\nruntime_version: 0.1.0\nmemory_namespace: real\nverification_profile: default\nworkspace:\n  root: .\n',
    );
    const log = join(dir, '.agent-os', 'runtime', 'events.jsonl');
    writeFileSync(log, `${JSON.stringify({ session_id: 'sess-1' })}\n`, 'utf-8');
    const record = { session_id: 'sess-1', project_id: 'wrong', repo_root: dir, log_path: log };
    const result = await validateLock(record, { repoRoot: dir });
    expect(result).toEqual([false, 'project_mismatch']);
  });

  it('rejects session_not_found', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-v-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      'project_id: demo\ndomain_type: d\nruntime_version: 0.1.0\nmemory_namespace: demo\nverification_profile: default\nworkspace:\n  root: .\n',
    );
    const log = join(dir, '.agent-os', 'runtime', 'events.jsonl');
    writeFileSync(log, `${JSON.stringify({ session_id: 'other' })}\n`, 'utf-8');
    const record = { session_id: 'sess-1', project_id: 'demo', repo_root: dir, log_path: log };
    const result = await validateLock(record, { repoRoot: dir });
    expect(result).toEqual([false, 'session_not_found']);
  });

  it('returns ok when everything matches', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-lock-v-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      'project_id: demo\ndomain_type: d\nruntime_version: 0.1.0\nmemory_namespace: demo\nverification_profile: default\nworkspace:\n  root: .\n',
    );
    const log = join(dir, '.agent-os', 'runtime', 'events.jsonl');
    writeFileSync(log, `${JSON.stringify({ session_id: 'sess-1' })}\n`, 'utf-8');
    const record = { session_id: 'sess-1', project_id: 'demo', repo_root: dir, log_path: log };
    const result = await validateLock(record, { repoRoot: dir });
    expect(result).toEqual([true, 'ok']);
  });
});
