import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RenderInputs {
  projectId: string;
  domainType: string;
  runtimeVersion: string;
  memoryNamespace: string;
  verificationProfile: string;
  criticalActions: string[];
  workspaceRoot: string;
}

const TEMPLATE_PATH = join(__dirname, 'project.yaml.template');

export function loadTemplate(path = TEMPLATE_PATH): string {
  return readFileSync(path, 'utf8');
}

export function renderProjectYaml(inputs: RenderInputs, templateText?: string): string {
  const template = templateText ?? loadTemplate();
  const criticalActionsLine =
    inputs.criticalActions.length === 0
      ? 'critical_actions: []'
      : `critical_actions:\n${inputs.criticalActions.map((a) => `  - ${a}`).join('\n')}`;
  return template
    .replaceAll('__PROJECT_ID__', inputs.projectId)
    .replaceAll('__DOMAIN_TYPE__', inputs.domainType)
    .replaceAll('__RUNTIME_VERSION__', inputs.runtimeVersion)
    .replaceAll('__MEMORY_NAMESPACE__', inputs.memoryNamespace)
    .replaceAll('__VERIFICATION_PROFILE__', inputs.verificationProfile)
    .replaceAll('__WORKSPACE_ROOT__', inputs.workspaceRoot)
    .replace(/^__CRITICAL_ACTIONS__$/m, criticalActionsLine);
}
