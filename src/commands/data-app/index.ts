import type { Command } from 'commander';
import { registerAppList } from './list';
import { registerAppInfo } from './info';
import { registerAppDeploy } from './deploy';
import { registerAppLogs } from './logs';
import { registerAppStop } from './stop';
import { registerAppStart } from './start';
import { registerAppOpen } from './open';
import { registerAppDelete } from './delete';

export function registerAppCommands(program: Command): void {
  const appCmd = program.command('data-app').description('Manage Data Apps');
  registerAppList(appCmd);
  registerAppInfo(appCmd);
  registerAppDeploy(appCmd);
  registerAppLogs(appCmd);
  registerAppStop(appCmd);
  registerAppStart(appCmd);
  registerAppOpen(appCmd);
  registerAppDelete(appCmd);
}
