#!/usr/bin/env bun
import { Command } from 'commander';
import { APP_NAME, APP_VERSION } from './constants';
import { CliContext } from './context';
import { registerAuth } from './commands/auth';
import { registerUse } from './commands/use';
import { registerAppCommands } from './commands/app/index';
import { registerConfigCommands } from './commands/config/index';
import { registerSecretsCommands } from './commands/secrets/index';
import { registerRunsCommands } from './commands/runs/index';
import { registerApiCommands } from './commands/api/index';
import { registerAllGeneratedCommands } from './generated/index';

const program = new Command();

program
  .name(APP_NAME)
  .version(APP_VERSION)
  .description('Keboola CLI — complete CLI over the entire Keboola API');

// Hand-written commands (data-app logical units + auth/use)
registerAuth(program);
registerUse(program);
registerAppCommands(program);
registerConfigCommands(program);
registerSecretsCommands(program);
registerRunsCommands(program);
registerApiCommands(program);

// Generated atomic commands (1:1 API method mapping)
// These require auth context — create lazily so auth/use commands work without it
try {
  const ctx = CliContext.fromEnvOrConfig();
  registerAllGeneratedCommands(program, ctx);
} catch {
  // Auth not configured yet — generated commands will not be available
  // This is expected when running `kbc auth login` for the first time
}

program.parse(process.argv);
