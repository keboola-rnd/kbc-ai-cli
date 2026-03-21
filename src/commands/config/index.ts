import type { Command } from 'commander';
import { registerConfigShow } from './show';
import { registerConfigSet } from './set';
import { registerConfigGit } from './git';

export function registerConfigCommands(program: Command): void {
  const configCmd = program.command('config').description('View and update app configuration');
  registerConfigShow(configCmd);
  registerConfigSet(configCmd);
  registerConfigGit(configCmd);
}
