import { type DetectedTestCommand, detectTestCommands } from './test-command-detector';
import type { DraftedPlan, DraftInput, PlanDrafter } from '../ccp/commands/shared/plan-drafter';

export interface PackPlanConfig {
  verification_profile: 'detected' | 'none';
}

export class PackPlanDrafter implements PlanDrafter {
  constructor(private readonly config: PackPlanConfig) {}

  async draft(input: DraftInput): Promise<DraftedPlan> {
    const riskTier =
      input.risks.length > 2 ? 'high' : input.risks.length > 0 ? 'medium' : 'low';

    let verification: Array<{ command: string; expected_signal: string }> = [];
    let purpose = `${input.goal} — manual implementation required`;
    let detectedCommands: DetectedTestCommand[] = [];

    if (this.config.verification_profile === 'detected') {
      try {
        detectedCommands = detectTestCommands(input.workspaceRoot);
      } catch {
        detectedCommands = [];
      }
      if (detectedCommands.length > 0) {
        const first = detectedCommands[0]!;
        const signal =
          input.successCriteria.length > 0
            ? input.successCriteria.map((sc) => sc.text).join('; ')
            : 'exit code 0';
        verification = [{ command: first.command, expected_signal: signal }];
        purpose = `${input.goal} — manual implementation required. Verification: ${first.command} (detected from ${first.source_file})`;
      } else {
        purpose = `${input.goal} — manual implementation required. No verification command detected at project root.`;
      }
    } else {
      // verification_profile === 'none'
      purpose = `${input.goal} — manual implementation required. Verification disabled by pack config.`;
    }

    return {
      scope: { in: ['.'], out: [] },
      steps: [
        {
          id: 'S-001',
          title: `Implement: ${input.goal} (manual implementation required)`,
          purpose,
          expected_files: [],
          commands: [],
          verification,
          risk_tier: riskTier as 'low' | 'medium' | 'high' | 'critical',
          depends_on: [],
        },
      ],
      approval_required: [],
      rollback: { strategy: 'git reset --hard pre-state captured before /run' },
      detectedCommands,
    };
  }
}
