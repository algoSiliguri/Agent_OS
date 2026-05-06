import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface PreflightOptions {
  targetRoot: string;
  upgrade: boolean;
  force: boolean;
}

export type PreflightResult = { ok: true } | { ok: false; reason: string };

export function runPreflight({ targetRoot, upgrade, force }: PreflightOptions): PreflightResult {
  const projectYaml = join(targetRoot, '.agent-os', 'project.yaml');
  const exists = existsSync(projectYaml);

  if (upgrade && !exists) {
    return {
      ok: false,
      reason:
        '--upgrade requires an existing .agent-os/project.yaml. Run /init <project-id> first.',
    };
  }

  if (exists && !upgrade && !force) {
    return {
      ok: false,
      reason:
        'This project is already initialized. Use /init --upgrade to refresh governance files (preserves your project.yaml), or /init --force to overwrite.',
    };
  }

  return { ok: true };
}
