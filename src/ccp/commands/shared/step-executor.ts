// src/ccp/commands/shared/step-executor.ts
export interface StepExecutionResult {
  status: 'completed' | 'failed';
  files_changed: string[];
  commands_run: string[];
  approvals: Array<{ tool: string; decided_by: string; at: string }>;
  events: string[];
  failure: null | {
    reason: string;
    summary: string;
    recoverable?: boolean;
    raw_output_ref?: string;
  };
}

export interface StepExecutor {
  executeStep(args: {
    stepId: string;
    step: {
      commands: Array<{ command: string; approval_tier: 1 | 2 | 3 | 4 }>;
      expected_files: Array<{ path: string; operation: 'read' | 'create' | 'modify' | 'delete' }>;
    };
  }): Promise<StepExecutionResult>;
}

export function makeMockStepExecutor(
  scripted: Record<string, Partial<StepExecutionResult>>,
): StepExecutor {
  return {
    async executeStep({ stepId }) {
      const s = scripted[stepId] ?? {};
      return {
        status: s.status ?? 'completed',
        files_changed: s.files_changed ?? [],
        commands_run: s.commands_run ?? [],
        approvals: s.approvals ?? [],
        events: s.events ?? [],
        failure: s.failure ?? null,
      };
    },
  };
}
