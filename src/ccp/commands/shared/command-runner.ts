import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CommandRunResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface CommandRunner {
  runCommand(command: string): Promise<CommandRunResult>;
}

export interface ShellCommandRunnerOptions {
  cwd: string;
  timeout?: number;
}

export function makeShellCommandRunner(opts: ShellCommandRunnerOptions): CommandRunner {
  const timeout = opts.timeout ?? 60_000;

  return {
    async runCommand(command) {
      const startedAt = Date.now();
      try {
        const { stdout, stderr } = await execFileAsync('sh', ['-c', command], {
          cwd: opts.cwd,
          timeout,
        });
        return {
          command,
          exitCode: 0,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
        };
      } catch (err: unknown) {
        const e = err as { code?: unknown; stdout?: string; stderr?: string; message?: string };
        return {
          command,
          exitCode: typeof e.code === 'number' ? e.code : 1,
          stdout: e.stdout ?? '',
          stderr: e.stderr ?? String(e.message ?? ''),
          durationMs: Date.now() - startedAt,
        };
      }
    },
  };
}
