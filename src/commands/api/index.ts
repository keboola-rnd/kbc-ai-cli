import type { Command } from 'commander';
import { registerRawApi } from './raw';

export function registerApiCommands(program: Command): void {
  registerRawApi(program);
}
