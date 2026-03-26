#!/usr/bin/env bun
import { Command } from 'commander';
import { APP_NAME, APP_VERSION } from './constants';
import { CliContext } from './context';
import { registerAllUnits } from './units/index';
import { registerAllGeneratedCommands } from './generated/index';

const program = new Command();

program
  .name(APP_NAME)
  .version(APP_VERSION)
  .description('Keboola CLI — complete CLI over the entire Keboola API');

// All commands require auth context except hand-written ones (auth, use, etc.)
// Create context lazily so auth/use commands work without credentials
try {
  const ctx = CliContext.fromEnvOrConfig();
  registerAllUnits(program, ctx);
  registerAllGeneratedCommands(program, ctx);
} catch (err: unknown) {
  // Auth not configured yet — register hand-written units only (no ctx).
  // Generated commands and logical units will not be available.
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes('Not authenticated') && !msg.includes('KBC_STORAGE_TOKEN') && !msg.includes('KBC_STORAGE_URL') && !msg.includes('not configured')) {
    throw err;
  }
  // Still register hand-written units (they don't need auth)
  registerAllUnits(program);
}

program.parse(process.argv);
