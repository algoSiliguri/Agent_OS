import { type DoctorReport, runDoctor } from '../../core/doctor';

export function runDoctorCommand(args: { repoRoot: string }): Promise<DoctorReport> {
  return Promise.resolve(runDoctor(args.repoRoot));
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((c) => {
    const mark = c.status === 'pass' ? '✓' : c.status === 'soft_fail' ? '~' : '✗';
    return `  ${mark} ${c.description}${c.detail ? ` — ${c.detail}` : ''}`;
  });
  return `${lines.join('\n')}\nstatus: ${report.status}`;
}
