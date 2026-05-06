import { type Static, Type } from '@sinclair/typebox';

const TrustLevel = Type.Union([
  Type.Literal('trusted'),
  Type.Literal('untrusted'),
  Type.Literal('blocked'),
  Type.Literal('local-dev-only'),
  Type.Literal('requires-review'),
]);

const Source = Type.Union([
  Type.Literal('pi'),
  Type.Literal('extension'),
  Type.String(), // also accepts "mcp:<server>"
]);

const ApprovalTier = Type.Union([
  Type.Literal(1),
  Type.Literal(2),
  Type.Literal(3),
  Type.Literal(4),
]);

const RetryPolicy = Type.Union([
  Type.Literal('none'),
  Type.Literal('idempotent'),
  Type.Literal('manual_only'),
]);

export const ToolMetadata = Type.Object({
  tool_id: Type.String(),
  source: Source,
  trust_level: TrustLevel,
  capability_type: Type.Union([
    Type.Literal('READ_LOCAL'),
    Type.Literal('WRITE_LOCAL'),
    Type.Literal('EXECUTE_LOCAL'),
    Type.Literal('READ_NETWORK'),
    Type.Literal('WRITE_NETWORK'),
    Type.Literal('MCP_READ'),
    Type.Literal('MCP_WRITE'),
    Type.Literal('BROWSER_READ'),
    Type.Literal('BROWSER_WRITE'),
    Type.Literal('MEMORY_READ'),
    Type.Literal('MEMORY_WRITE'),
    Type.Literal('GOVERNANCE_MUTATION'),
  ]),
  read_or_write: Type.Union([Type.Literal('read'), Type.Literal('write')]),
  network_required: Type.Boolean(),
  workspace_required: Type.Boolean(),
  approval_tier: ApprovalTier,
  audit_metadata: Type.Record(Type.String(), Type.Unknown()),
  retry_policy: RetryPolicy,
  idempotency_key_support: Type.Boolean(),
});
export type ToolMetadata = Static<typeof ToolMetadata>;

export class ToolRegistry {
  private readonly tools = new Map<string, ToolMetadata>();

  register(meta: ToolMetadata): void {
    if (this.tools.has(meta.tool_id)) {
      throw new Error(`tool already registered: ${meta.tool_id}`);
    }
    this.tools.set(meta.tool_id, meta);
  }

  lookup(toolId: string): ToolMetadata | undefined {
    return this.tools.get(toolId);
  }

  all(): ReadonlyArray<ToolMetadata> {
    return [...this.tools.values()];
  }
}
