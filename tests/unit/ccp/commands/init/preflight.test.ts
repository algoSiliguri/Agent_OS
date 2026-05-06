import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPreflight } from '../../../../../src/ccp/commands/init/preflight';

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), 'aos-pre-'));
}

describe('runPreflight', () => {
  it('passes on a clean dir', () => {
    expect(runPreflight({ targetRoot: freshDir(), upgrade: false, force: false })).toEqual({
      ok: true,
    });
  });

  it('fails if .agent-os/project.yaml exists, no flag', () => {
    const dir = freshDir();
    mkdirSync(join(dir, '.agent-os'), { recursive: true });
    writeFileSync(join(dir, '.agent-os', 'project.yaml'), 'project_id: x\n');
    const r = runPreflight({ targetRoot: dir, upgrade: false, force: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/already initialized/);
  });

  it('passes with --force on existing project.yaml', () => {
    const dir = freshDir();
    mkdirSync(join(dir, '.agent-os'), { recursive: true });
    writeFileSync(join(dir, '.agent-os', 'project.yaml'), 'project_id: x\n');
    expect(runPreflight({ targetRoot: dir, upgrade: false, force: true })).toEqual({ ok: true });
  });

  it('passes with --upgrade on existing project.yaml', () => {
    const dir = freshDir();
    mkdirSync(join(dir, '.agent-os'), { recursive: true });
    writeFileSync(join(dir, '.agent-os', 'project.yaml'), 'project_id: x\n');
    expect(runPreflight({ targetRoot: dir, upgrade: true, force: false })).toEqual({ ok: true });
  });

  it('fails with --upgrade on missing project.yaml', () => {
    const dir = freshDir();
    const r = runPreflight({ targetRoot: dir, upgrade: true, force: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/upgrade requires/i);
  });

  it('treats partial .agent-os without project.yaml as fresh', () => {
    const dir = freshDir();
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    expect(runPreflight({ targetRoot: dir, upgrade: false, force: false })).toEqual({ ok: true });
  });
});
