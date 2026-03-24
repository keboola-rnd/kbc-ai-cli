import type { Command } from 'commander';
import { registerComponentList } from './list';
import { registerComponentInfo } from './info';
import { registerConfigList } from './config-list';
import { registerConfigDetail } from './config-detail';
import { registerConfigCreate } from './config-create';
import { registerConfigDelete } from './config-delete';

export function registerComponentCommands(program: Command): void {
  const cmd = program.command('component').description('Manage components and configurations');
  registerComponentList(cmd);
  registerComponentInfo(cmd);
  registerConfigList(cmd);
  registerConfigDetail(cmd);
  registerConfigCreate(cmd);
  registerConfigDelete(cmd);
}
