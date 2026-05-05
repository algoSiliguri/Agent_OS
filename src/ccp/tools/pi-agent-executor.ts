// src/ccp/tools/pi-agent-executor.ts
import type { StepExecutor } from '../commands/shared/step-executor';

export interface PiAgentLike {
  runAgent(prompt: string): Promise<{
    filesChanged: string[];
    commandsRun: string[];
    exitCode: number;
    errorSummary?: string;
  }>;
}

export function makePiAgentExecutor(opts: { agent: PiAgentLike }): StepExecutor {
  return {
    async executeStep({ stepId, step }) {
      const prompt = renderStepPrompt(stepId, step);
      const result = await opts.agent.runAgent(prompt);
      if (result.exitCode === 0) {
        return {
          status: 'completed',
          files_changed: result.filesChanged,
          commands_run: result.commandsRun,
          approvals: [],
          events: [],
          failure: null,
        };
      }
      const summary = result.errorSummary ?? `exit code ${result.exitCode}`;
      return {
        status: 'failed',
        files_changed: result.filesChanged,
        commands_run: result.commandsRun,
        approvals: [],
        events: [],
        failure: { reason: 'agent_nonzero_exit', summary, recoverable: true },
      };
    },
  };
}

function renderStepPrompt(
  stepId: string,
  step: {
    commands: Array<{ command: string; approval_tier: number }>;
    expected_files: Array<{ path: string; operation: string }>;
  },
): string {
  const cmds = step.commands.map((c) => `- ${c.command} (tier ${c.approval_tier})`).join('\n');
  const files = step.expected_files.map((f) => `- ${f.operation} ${f.path}`).join('\n');
  return [
    `Execute step ${stepId}.`,
    'Expected files to touch:',
    files || '  (none specified)',
    'Commands to run:',
    cmds || '  (none specified)',
    'When done, report files actually changed and any non-zero exit.',
  ].join('\n');
}
