import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  taskArtifactPath,
  taskDir,
  taskPendingCapturesPath,
  taskRawDir,
  taskRawFile,
  taskStatePath,
} from '../../../src/ccp/task-paths';

const ROOT = '/repo';

describe('task-paths', () => {
  it('taskDir resolves under .agent-os/tasks/<task>', () => {
    expect(taskDir(ROOT, 'T-001')).toBe(join(ROOT, '.agent-os', 'tasks', 'T-001'));
  });

  it('taskStatePath returns state.json under task dir', () => {
    expect(taskStatePath(ROOT, 'T-001')).toBe(
      join(ROOT, '.agent-os', 'tasks', 'T-001', 'state.json'),
    );
  });

  it('taskArtifactPath maps artifact-type → <type>.yaml', () => {
    expect(taskArtifactPath(ROOT, 'T-001', 'grill')).toBe(
      join(ROOT, '.agent-os', 'tasks', 'T-001', 'grill.yaml'),
    );
    expect(taskArtifactPath(ROOT, 'T-001', 'plan')).toBe(
      join(ROOT, '.agent-os', 'tasks', 'T-001', 'plan.yaml'),
    );
  });

  it('taskRawDir + taskRawFile resolve compressed-output storage', () => {
    expect(taskRawDir(ROOT, 'T-001')).toBe(join(ROOT, '.agent-os', 'tasks', 'T-001', 'raw'));
    expect(taskRawFile(ROOT, 'T-001', 'abc123')).toBe(
      join(ROOT, '.agent-os', 'tasks', 'T-001', 'raw', 'abc123.txt'),
    );
  });

  it('taskPendingCapturesPath resolves the deferred-queue file', () => {
    expect(taskPendingCapturesPath(ROOT, 'T-001')).toBe(
      join(ROOT, '.agent-os', 'tasks', 'T-001', 'pending-captures.yaml'),
    );
  });
});
