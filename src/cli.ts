#!/usr/bin/env bun
import { Command } from 'commander';
import { APP_NAME, APP_VERSION } from './constants';
import { registerAuth } from './commands/auth';
import { registerUse } from './commands/use';
import { registerAppCommands } from './commands/app/index';
import { registerConfigCommands } from './commands/config/index';
import { registerSecretsCommands } from './commands/secrets/index';
import { registerRunsCommands } from './commands/runs/index';
import { registerApiCommands } from './commands/api/index';

const program = new Command();

program
  .name(APP_NAME)
  .version(APP_VERSION)
  .description('Keboola Data App CLI — manage Data Apps from the terminal');

// Register all command groups
registerAuth(program);
registerUse(program);
registerAppCommands(program);
registerConfigCommands(program);
registerSecretsCommands(program);
registerRunsCommands(program);
registerApiCommands(program);

program.parse(process.argv);
