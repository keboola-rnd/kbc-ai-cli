import chalk from 'chalk';

export type OutputFormat = 'json' | 'text' | 'table';

export function formatOutput(data: unknown, format: OutputFormat = 'text'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  if (format === 'table' && Array.isArray(data)) {
    return formatTable(data);
  }
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
}

export function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '(no data)';

  const keys = Object.keys(rows[0]!);
  const widths = keys.map((key) => {
    const maxVal = Math.max(...rows.map((r) => String(r[key] ?? '').length));
    return Math.max(key.length, maxVal);
  });

  const header = keys.map((k, i) => k.padEnd(widths[i]!)).join('  ');
  const separator = widths.map((w) => '-'.repeat(w)).join('  ');
  const body = rows.map((row) =>
    keys.map((k, i) => String(row[k] ?? '').padEnd(widths[i]!)).join('  '),
  );

  return [chalk.bold(header), separator, ...body].join('\n');
}

export function printSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function printError(message: string): void {
  console.error(chalk.red(message));
}

export function printWarning(message: string): void {
  console.error(chalk.yellow(message));
}

export function printInfo(message: string): void {
  console.log(chalk.cyan(message));
}

export function output(data: unknown, opts?: { json?: boolean }): void {
  const format: OutputFormat = opts?.json ? 'json' : 'text';
  console.log(formatOutput(data, format));
}
