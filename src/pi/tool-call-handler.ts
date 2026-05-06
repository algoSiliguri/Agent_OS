// src/pi/tool-call-handler.ts
import {
  type SessionApprovalCache,
  decideToolCall,
  recordTier2Approval,
} from '../ccp/policy/decision-flow';
import type { ToolRegistry } from '../ccp/policy/tool-registry';
import type { ProjectConfig } from '../core/manifest';
import type { UiAdapter } from './ui';

export interface PiToolCallContext {
  toolName: string;
  input: Record<string, unknown>;
  block(reason: string): void;
}

export interface HandlerContext {
  registry: ToolRegistry;
  cache: SessionApprovalCache;
  config: ProjectConfig;
  ui: UiAdapter;
}

export async function handleToolCall(call: PiToolCallContext, ctx: HandlerContext): Promise<void> {
  const decision = decideToolCall(
    { toolName: call.toolName, input: call.input },
    { registry: ctx.registry, cache: ctx.cache, config: ctx.config },
  );

  switch (decision.outcome) {
    case 'pass':
      return;
    case 'block':
      call.block(decision.reason);
      return;
    case 'ask': {
      const message = renderPrompt(call.toolName, call.input, decision.tier, decision.reason);
      const approved = await ctx.ui.confirm(message);
      if (decision.tier === 2 && decision.cacheKey) {
        recordTier2Approval(ctx.cache, decision.cacheKey, approved);
      }
      if (!approved) {
        call.block(`user denied (tier ${decision.tier})`);
      }
    }
  }
}

function renderPrompt(
  toolName: string,
  input: Record<string, unknown>,
  tier: number,
  reason: string,
): string {
  const summary = JSON.stringify(input);
  const truncated = summary.length > 120 ? `${summary.slice(0, 120)}…` : summary;
  return `[tier ${tier}] ${reason}\n  tool: ${toolName}\n  input: ${truncated}\nProceed?`;
}
