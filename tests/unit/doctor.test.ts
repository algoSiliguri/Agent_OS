import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inferSourceMode, resolvePackVersionDetail, runDoctor } from '../../src/core/doctor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'aos-dr-'));
}

/** Write a minimal workflow-pack.yaml with the given version. */
function writePack(dir: string, packId: string, version: string): string {
  const packDir = join(dir, packId);
  mkdirSync(packDir, { recursive: true });
  const manifestPath = join(packDir, 'workflow-pack.yaml');
  writeFileSync(
    manifestPath,
    [
      `workflow_pack_id: ${packId}`,
      `version: "${version}"`,
      'schema_version: "1.0.0"',
      'runtime_target: pi',
      'phases:',
      '  - id: grill',
      '    agent_os_command: /grill',
      '    allowed_predecessors: []',
      '    produces: []',
      '    may_edit_source: false',
      '    requires_approval: false',
      '    validators: []',
      'validators: []',
    ].join('\n'),
    'utf-8',
  );
  return manifestPath;
}

// ---------------------------------------------------------------------------
// resolvePackVersionDetail — unit tests (no full doctor setup needed)
// ---------------------------------------------------------------------------

describe('resolvePackVersionDetail', () => {
  it('PASS: installed == bundled version → state current', () => {
    const tmp = makeTmpDir();
    const installedPath = writePack(join(tmp, 'installed'), 'agent-os-core', '1.2.0');
    const bundledPath = writePack(join(tmp, 'bundled'), 'agent-os-core', '1.2.0');

    const pvd = resolvePackVersionDetail('agent-os-core', installedPath, bundledPath);

    expect(pvd.state).toBe('current');
    expect(pvd.installedVersion).toBe('1.2.0');
    expect(pvd.detail).toContain('v1.2.0');
    expect(pvd.detail).toContain('current');
  });

  it('SOFT_FAIL: installed < bundled → state stale, detail shows both versions + recovery action', () => {
    const tmp = makeTmpDir();
    const installedPath = writePack(join(tmp, 'installed'), 'agent-os-core', '1.0.0');
    const bundledPath = writePack(join(tmp, 'bundled'), 'agent-os-core', '1.2.0');

    const pvd = resolvePackVersionDetail('agent-os-core', installedPath, bundledPath);

    expect(pvd.state).toBe('stale');
    expect(pvd.installedVersion).toBe('1.0.0');
    expect(pvd.bundledVersion).toBe('1.2.0');
    expect(pvd.detail).toContain('v1.0.0');
    expect(pvd.detail).toContain('v1.2.0');
    expect(pvd.detail).toContain('/init --upgrade --force');
  });

  it('WARN: installed > bundled → state newer (not stale)', () => {
    const tmp = makeTmpDir();
    const installedPath = writePack(join(tmp, 'installed'), 'agent-os-core', '9.9.9');
    const bundledPath = writePack(join(tmp, 'bundled'), 'agent-os-core', '1.2.0');

    const pvd = resolvePackVersionDetail('agent-os-core', installedPath, bundledPath);

    expect(pvd.state).toBe('newer');
    expect(pvd.detail).toContain('newer than bundled');
    // newer is NOT stale
    expect(pvd.state).not.toBe('stale');
    expect(pvd.state).not.toBe('unknown');
  });

  it('WARN: installed version missing → state unknown (no crash)', () => {
    const tmp = makeTmpDir();
    // Write a pack without a version field
    const packDir = join(tmp, 'installed', 'agent-os-core');
    mkdirSync(packDir, { recursive: true });
    const installedPath = join(packDir, 'workflow-pack.yaml');
    writeFileSync(installedPath, 'workflow_pack_id: agent-os-core\nphases: []\n', 'utf-8');

    const bundledPath = writePack(join(tmp, 'bundled'), 'agent-os-core', '1.2.0');

    const pvd = resolvePackVersionDetail('agent-os-core', installedPath, bundledPath);

    expect(pvd.state).toBe('unknown');
    expect(pvd.detail).toContain('version unknown');
  });

  it('WARN: installed version is "banana" → state unknown (no crash)', () => {
    const tmp = makeTmpDir();
    const packDir = join(tmp, 'installed', 'agent-os-core');
    mkdirSync(packDir, { recursive: true });
    const installedPath = join(packDir, 'workflow-pack.yaml');
    writeFileSync(
      installedPath,
      'workflow_pack_id: agent-os-core\nversion: banana\nphases: []\n',
      'utf-8',
    );

    const bundledPath = writePack(join(tmp, 'bundled'), 'agent-os-core', '1.2.0');

    const pvd = resolvePackVersionDetail('agent-os-core', installedPath, bundledPath);

    expect(pvd.state).toBe('unknown');
    expect(pvd.detail).toContain('version unknown');
  });

  it('no-bundled: bundled pack missing → shows installed version without stale flag', () => {
    const tmp = makeTmpDir();
    const installedPath = writePack(join(tmp, 'installed'), 'custom-pack', '2.0.0');
    // bundledPath does not exist
    const bundledPath = join(tmp, 'bundled', 'custom-pack', 'workflow-pack.yaml');

    const pvd = resolvePackVersionDetail('custom-pack', installedPath, bundledPath);

    expect(pvd.state).toBe('no-bundled');
    expect(pvd.detail).toContain('v2.0.0');
    // no-bundled should not be treated as stale
    expect(pvd.state).not.toBe('stale');
    expect(pvd.state).not.toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// inferSourceMode — pure function, no FS required
// ---------------------------------------------------------------------------

describe('inferSourceMode', () => {
  const packageRoot = '/home/user/.pi/agent/packages/agent-os';

  it('local-dev: AGENT_OS_DEV_HOME env var set', () => {
    const original = process.env.AGENT_OS_DEV_HOME;
    process.env.AGENT_OS_DEV_HOME = '/home/user/Agent_OS';
    try {
      const result = inferSourceMode(packageRoot, []);
      expect(result.mode).toBe('local-dev');
    } finally {
      if (original === undefined) delete process.env.AGENT_OS_DEV_HOME;
      else process.env.AGENT_OS_DEV_HOME = original;
    }
  });

  it('local-path: source is an absolute filesystem path', () => {
    const result = inferSourceMode(packageRoot, ['/home/user/projects/Agent_OS']);
    expect(result.mode).toBe('local-path');
    expect(result.source).toBe('/home/user/projects/Agent_OS');
  });

  it('git: source starts with git:', () => {
    const result = inferSourceMode(packageRoot, ['git:github.com/algoSiliguri/Agent_OS@v1.6.1']);
    expect(result.mode).toBe('git');
    expect(result.source).toContain('Agent_OS');
  });

  it('released-package: packageRoot inside node_modules', () => {
    const result = inferSourceMode('/home/user/node_modules/@agnivadc/agent-os', []);
    expect(result.mode).toBe('released-package');
  });

  it('unknown: empty sources, no env vars, not node_modules', () => {
    const original = process.env.AGENT_OS_DEV_HOME;
    const original2 = process.env.AGENT_OS_LOCAL_DEV;
    delete process.env.AGENT_OS_DEV_HOME;
    delete process.env.AGENT_OS_LOCAL_DEV;
    try {
      const result = inferSourceMode(packageRoot, []);
      expect(result.mode).toBe('unknown');
    } finally {
      if (original !== undefined) process.env.AGENT_OS_DEV_HOME = original;
      if (original2 !== undefined) process.env.AGENT_OS_LOCAL_DEV = original2;
    }
  });
});

// ---------------------------------------------------------------------------
// runDoctor — existing test preserved
// ---------------------------------------------------------------------------

describe('doctor', () => {
  it('reports missing constitution as a hard failure', () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    const report = runDoctor(dir);
    expect(report.status).toBe('hard_fail');
    expect(report.checks.find((c) => c.id === 'constitution_exists')?.status).toBe('fail');
  });

  it('reports install provenance before project health failures', () => {
    const dir = makeTmpDir();
    const report = runDoctor(dir);
    const ids = report.checks.map((c) => c.id);

    expect(ids).toContain('pi_executable');
    expect(ids).toContain('pi_version');
    expect(ids).toContain('agent_os_package');
    expect(ids).toContain('agent_os_source');
    expect(ids).toContain('agent_os_git_commit');
    expect(ids).toContain('knowledge_brain_executable');
    expect(ids).toContain('knowledge_brain_version');
    expect(ids.indexOf('agent_os_package')).toBeLessThan(ids.indexOf('constitution_exists'));
  });
});
