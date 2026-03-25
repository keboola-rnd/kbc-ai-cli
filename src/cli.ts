#!/usr/bin/env bun
import { Command } from 'commander';
import { APP_NAME, APP_VERSION } from './constants';
import { CliContext } from './context';
import { registerAuth } from './commands/auth';
import { registerUse } from './commands/use';
import { registerAppCommands } from './commands/data-app/index';
import { registerConfigCommands } from './commands/config/index';
import { registerSecretsCommands } from './commands/secrets/index';
import { registerRunsCommands } from './commands/runs/index';
import { registerApiCommands } from './commands/api/index';
import { registerAllGeneratedCommands } from './generated/index';
import { registerAllLogicalUnits } from './generated/units/index';

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
  registerAllLogicalUnits(program, ctx);
} catch (err: unknown) {
  // Auth not configured yet — generated commands will not be available.
  // Only suppress auth-related errors (missing token/url); re-throw unexpected ones.
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes('Not authenticated') && !msg.includes('KBC_STORAGE_TOKEN') && !msg.includes('KBC_STORAGE_URL') && !msg.includes('not configured')) {
    throw err;
  }
}

program.parse(process.argv);
