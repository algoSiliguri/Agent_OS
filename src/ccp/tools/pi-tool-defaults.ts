import type { ToolRegistry } from '../policy/tool-registry';
import { piToolDefaults } from './tool-id-conventions';

export function seedPiTools(registry: ToolRegistry): void {
  for (const tool of piToolDefaults()) {
    if (registry.lookup(tool.tool_id)) continue; // idempotent
    registry.register(tool);
  }
}
