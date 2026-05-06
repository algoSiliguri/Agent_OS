import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { readEvents } from '../core/event-log';
import { initProjectionSchema, mirrorApprovalEvent, mirrorTaskEvent } from '../core/projection';
import { eventLogPath, runtimeDir, sessionSnapshotPath } from '../core/runtime-paths';
import { writeJsonAtomic } from '../core/session-store';
import { taskDir, taskStatePath } from './task-paths';

export interface ReplaySummary {
  session_id: string | null;
  tasks: Record<string, string>; // task_id → current state
}

export function replayFromEventLog(repoRoot: string): ReplaySummary {
  const events = readEvents(eventLogPath(repoRoot));
  const summary: ReplaySummary = { session_id: null, tasks: {} };
  if (events.length === 0) return summary;

  // Rebuild projection.db from scratch
  const projectionPath = join(runtimeDir(repoRoot), 'projection.db');
  if (existsSync(projectionPath)) {
    try {
      unlinkSync(projectionPath);
    } catch {
      // best-effort
    }
  }
  const db = new Database(projectionPath);
  initProjectionSchema(db);

  let currentTaskId: string | null = null;

  for (const event of events) {
    switch (event.event_type) {
      case 'BINDING':
        summary.session_id = event.session_id;
        break;
      case 'TASK_CREATED':
      case 'TASK_STATE_TRANSITION':
      case 'TASK_COMPLETED':
      case 'TASK_ABORTED':
        mirrorTaskEvent(db, event);
        break;
      case 'TOOL_REQUESTED':
      case 'TOOL_APPROVED':
      case 'TOOL_DENIED':
        mirrorApprovalEvent(db, event, { namespace: 'replay' });
        break;
    }
    const payloadTaskId = (event.payload as Record<string, unknown>).task_id;
    if (typeof payloadTaskId === 'string') {
      currentTaskId = payloadTaskId;
      if (event.event_type === 'TASK_CREATED') summary.tasks[payloadTaskId] = 'NEW_IDEA';
      if (event.event_type === 'TASK_STATE_TRANSITION') {
        const to = String((event.payload as Record<string, unknown>).to ?? '');
        if (to) summary.tasks[payloadTaskId] = to;
      }
      if (event.event_type === 'TASK_COMPLETED') summary.tasks[payloadTaskId] = 'COMPLETED';
      if (event.event_type === 'TASK_ABORTED') summary.tasks[payloadTaskId] = 'ABORTED';
    }
  }

  db.close();

  // Write session.json snapshot
  if (summary.session_id) {
    writeJsonAtomic(sessionSnapshotPath(repoRoot), {
      session_id: summary.session_id,
      current_task_id: currentTaskId,
      tasks: summary.tasks,
      restored_at: new Date().toISOString(),
    });
  }

  // Write per-task state.json snapshots
  for (const [taskId, state] of Object.entries(summary.tasks)) {
    mkdirSync(taskDir(repoRoot, taskId), { recursive: true });
    writeJsonAtomic(taskStatePath(repoRoot, taskId), {
      task_id: taskId,
      state,
      restored_at: new Date().toISOString(),
    });
  }

  return summary;
}
