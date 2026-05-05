import { describe, expect, it } from 'vitest';
import {
  type StepExecutor,
  makeMockStepExecutor,
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
