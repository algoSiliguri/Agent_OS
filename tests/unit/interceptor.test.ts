import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { readEvents } from '../../src/core/event-log';
import {
  computeActionHash,
  guardMemoryWrite,
  requestCriticalAction,
} from '../../src/core/interceptor';
import { initProjectionSchema } from '../../src/core/projection';

describe('interceptor', () => {
  function setupRepo(): string {
    const dir = mkdtempSync(join(tmpdir(), 'aos-int-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      `project_id: demo
domain_type: trading
runtime_version: 0.1.0
memory_namespace: demo
verification_profile: default
critical_actions: []
workspace:
  root: .
`,
    );
    return dir;
  }

  it('computeActionHash is deterministic and 16 hex chars', () => {
    const h1 = computeActionHash('memory_write_global', { a: 1, b: 2 });
    const h2 = computeActionHash('memory_write_global', { b: 2, a: 1 });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{16}$/);
  });

  it('requestCriticalAction emits a TOOL_REQUESTED event (Q2 rename)', async () => {
    const dir = setupRepo();
    const hash = await requestCriticalAction({
      repoRoot: dir,
      sessionId: 'sess-1',
      capability: 'memory_write_global',
      resolvedArgs: { node: 'foo' },
      ttlSeconds: 30,
    });
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
    const events = readEvents(join(dir, '.agent-os', 'runtime', 'events.jsonl'));
    expect(events).toHaveLength(1);
    expect(events[0]?.event_type).toBe('TOOL_REQUESTED');
  });

  it('requestCriticalAction mirrors a PENDING row into projection.db', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aos-int-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    writeFileSync(
      join(dir, '.agent-os', 'project.yaml'),
      `project_id: demo
domain_type: d
runtime_version: 0.1.0
memory_namespace: demo
verification_profile: default
critical_actions: []
workspace:
  root: .
`,
    );
    // Pre-create projection.db so interceptor finds it
    const dbPath = join(dir, '.agent-os', 'runtime', 'projection.db');
    const db = new Database(dbPath);
    initProjectionSchema(db);
    db.close();

    await requestCriticalAction({
      repoRoot: dir,
      sessionId: 'sess-1',
      capability: 'memory_write_global',
      resolvedArgs: { node: 'foo' },
    });

    const db2 = new Database(dbPath, { readonly: true });
    const row = db2.prepare('SELECT * FROM approvals').get() as
      | { final_status: string }
      | undefined;
    db2.close();
    expect(row?.final_status).toBe('PENDING');
  });

  it('guardMemoryWrite blocks global write when global_memory_write disabled', () => {
    const dir = setupRepo();
    const logPath = join(dir, '.agent-os', 'runtime', 'events.jsonl');
    const allowed = guardMemoryWrite({
      sessionId: 'sess-1',
      actionHash: 'h-1',
      requestedNamespace: 'global',
      allowedNamespace: 'demo',
      globalWritesEnabled: false,
      logPath,
    });
    expect(allowed).toBe(false);
    const events = readEvents(logPath);
    expect(events.find((e) => e.event_type === 'PERMISSION_DENIED')).toBeTruthy();
  });
});
