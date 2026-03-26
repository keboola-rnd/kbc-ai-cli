import type { Command } from 'commander';
import { registerRunsList } from './list';
import { registerRunsShow } from './show';

export function registerRunsCommands(program: Command): void {
  const runsCmd = program.command('runs').description('View deployment run history');
  registerRunsList(runsCmd);
  registerRunsShow(runsCmd);
}
