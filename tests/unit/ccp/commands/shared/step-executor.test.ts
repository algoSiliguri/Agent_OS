import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type StepExecutor,
  makeMockStepExecutor,
  makeShellStepExecutor,
} from '../../../../../src/ccp/commands/shared/step-executor';

describe('makeMockStepExecutor', () => {
  it('returns success when scripted to succeed', async () => {
    const exec: StepExecutor = makeMockStepExecutor({
      'S-1': { status: 'completed', files_changed: ['src/foo.ts'], commands_run: ['npm install'] },
    });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: { commands: [], expected_files: [] } as never,
    });
    expect(r.status).toBe('completed');
    expect(r.files_changed).toContain('src/foo.ts');
  });

  it('returns recoverable failure when scripted', async () => {
    const exec = makeMockStepExecutor({
      'S-1': {
        status: 'failed',
        failure: { reason: 'test_failed', summary: 'one test failed', recoverable: true },
      },
    });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: { commands: [], expected_files: [] } as never,
    });
    expect(r.status).toBe('failed');
    expect(r.failure?.reason).toBe('test_failed');
  });
});

describe('makeShellStepExecutor', () => {
  it('runs a real command and returns completed', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-shell-'));
    const exec = makeShellStepExecutor({ cwd });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: {
        commands: [{ command: 'echo hello', approval_tier: 1 }],
        expected_files: [],
      },
    });
    expect(r.status).toBe('completed');
    expect(r.commands_run).toContain('echo hello');
    expect(r.failure).toBeNull();
  });

  it('records expected_files as files_changed', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-shell-'));
    const exec = makeShellStepExecutor({ cwd });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: {
        commands: [{ command: 'true', approval_tier: 1 }],
        expected_files: [{ path: 'src/foo.ts', operation: 'modify' }],
      },
    });
    expect(r.status).toBe('completed');
    expect(r.files_changed).toContain('src/foo.ts');
  });

  it('returns recoverable failure on non-zero exit', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-shell-'));
    const exec = makeShellStepExecutor({ cwd });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: {
        commands: [{ command: 'exit 42', approval_tier: 2 }],
        expected_files: [],
      },
    });
    expect(r.status).toBe('failed');
    expect(r.failure?.reason).toMatch(/cmd_exit_/);
    expect(r.failure?.recoverable).toBe(true);
  });

  it('stops at first failing command in multi-command step', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-shell-'));
    const exec = makeShellStepExecutor({ cwd });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: {
        commands: [
          { command: 'exit 1', approval_tier: 1 },
          { command: 'echo should_not_run', approval_tier: 1 },
        ],
        expected_files: [],
      },
    });
    expect(r.status).toBe('failed');
    expect(r.commands_run).toHaveLength(1);
  });

  it('step with no commands returns completed', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-shell-'));
    const exec = makeShellStepExecutor({ cwd });
    const r = await exec.executeStep({
      stepId: 'S-1',
      step: { commands: [], expected_files: [] },
    });
    expect(r.status).toBe('completed');
  });
});
