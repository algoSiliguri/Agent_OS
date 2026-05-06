import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTaskCreatedEvent, buildTaskStateTransitionEvent } from '../../../src/ccp/ccp-events';
import { replayFromEventLog } from '../../../src/ccp/recovery';
import { taskStatePath } from '../../../src/ccp/task-paths';
import { buildBindingEvent } from '../../../src/core/events';
import { eventLogPath } from '../../../src/core/runtime-paths';
import { appendJsonlEventAtomic } from '../../../src/core/session-store';

describe('recovery.replayFromEventLog', () => {
  function fixture(): string {
    const dir = mkdtempSync(join(tmpdir(), 'aos-rec-'));
    mkdirSync(join(dir, '.agent-os', 'runtime'), { recursive: true });
    return dir;
  }

  it('reconstructs session.json and tasks/<id>/state.json from events', () => {
    const dir = fixture();
    const log = eventLogPath(dir);
    appendJsonlEventAtomic(log, buildBindingEvent({ sessionId: 'sess-1', projectId: 'demo' }));
    appendJsonlEventAtomic(
      log,
      buildTaskCreatedEvent({
        sessionId: 'sess-1',
        taskId: 'T-001',
        goal: 'g',
        userType: 'developer',
      }),
    );
    appendJsonlEventAtomic(
      log,
      buildTaskStateTransitionEvent({
        sessionId: 'sess-1',
        taskId: 'T-001',
        from: 'NEW_IDEA',
        to: 'GRILLING',
        triggeredBy: '/grill',
      }),
    );

    const summary = replayFromEventLog(dir);
    expect(summary.session_id).toBe('sess-1');
    expect(summary.tasks).toEqual({ 'T-001': 'GRILLING' });

    const session = JSON.parse(
      readFileSync(join(dir, '.agent-os', 'runtime', 'session.json'), 'utf-8'),
    );
    expect(session.session_id).toBe('sess-1');
    expect(session.current_task_id).toBe('T-001');

    const taskState = JSON.parse(readFileSync(taskStatePath(dir, 'T-001'), 'utf-8'));
    expect(taskState.state).toBe('GRILLING');
  });

  it('returns empty summary when no events', () => {
    const dir = fixture();
    const summary = replayFromEventLog(dir);
    expect(summary.session_id).toBe(null);
    expect(summary.tasks).toEqual({});
  });
});
