// src/ccp/commands/shared/step-executor.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CommandOutput {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

export interface StepExecutionResult {
  status: 'completed' | 'failed';
  files_changed: string[];
  commands_run: string[];
  command_outputs: CommandOutput[];
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
        command_outputs: s.command_outputs ?? [],
        approvals: s.approvals ?? [],
        events: s.events ?? [],
        failure: s.failure ?? null,
      };
    },
  };
}

export interface ShellExecutorOptions {
  cwd: string;
  timeout?: number;
}

export function makeShellStepExecutor(opts: ShellExecutorOptions): StepExecutor {
  const timeout = opts.timeout ?? 60_000;
  return {
    async executeStep({ step }) {
      const commandsRun: string[] = [];
      const commandOutputs: CommandOutput[] = [];
      const events: string[] = [];

      for (const { command } of step.commands) {
        commandsRun.push(command);
        const t0 = Date.now();
        try {
          const { stdout, stderr } = await execFileAsync('sh', ['-c', command], { cwd: opts.cwd, timeout });
          const duration_ms = Date.now() - t0;
          commandOutputs.push({ command, exit_code: 0, stdout, stderr, duration_ms });
          events.push(`cmd_ok: ${command.slice(0, 120)}`);
        } catch (err: unknown) {
          const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
          const exitCode = e.code ?? 1;
          const stdout = e.stdout ?? '';
          const stderr = (e.stderr ?? String(e.message ?? '')).slice(0, 400);
          const duration_ms = Date.now() - t0;
          commandOutputs.push({ command, exit_code: exitCode, stdout, stderr, duration_ms });
          return {
            status: 'failed',
            files_changed: [],
            commands_run: commandsRun,
            command_outputs: commandOutputs,
            approvals: [],
            events,
            failure: {
              reason: `cmd_exit_${exitCode}`,
              summary: stderr || `exit code ${exitCode}`,
              recoverable: true,
            },
          };
        }
      }

      // expected_files: v1 records declared paths but does not enforce at runtime.
      // Enforcement is advisory — future versions can add a post-run diff check.
      return {
        status: 'completed',
        files_changed: step.expected_files.map((f) => f.path),
        commands_run: commandsRun,
        command_outputs: commandOutputs,
        approvals: [],
        events,
        failure: null,
      };
    },
  };
}
