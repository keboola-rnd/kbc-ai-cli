import type { Command } from 'commander';
import type { CliContext } from '../context';

// Hand-written units
import { registerAuth } from './auth';
import { registerUse } from './use';
import { registerAppCommands } from './data-app/index';
import { registerConfigCommands } from './config/index';
import { registerSecretsCommands } from './secrets/index';
import { registerRunsCommands } from './runs/index';
import { registerApiCommands } from './api/index';

// Generated logical units (Layer 2)
import { registerAllLogicalUnits } from './_generated';

/**
 * Register all CLI units — both hand-written and generated.
 *
 * Hand-written units (auth, use, data-app, config, secrets, runs, api)
 * do NOT require auth context; they are always available.
 *
 * Generated logical units require a CliContext with valid credentials.
 */
export function registerAllUnits(program: Command, ctx?: CliContext): void {
  // Hand-written units (always available, no auth required)
  registerAuth(program);
  registerUse(program);
  registerAppCommands(program);
  registerConfigCommands(program);
  registerSecretsCommands(program);
  registerRunsCommands(program);
  registerApiCommands(program);

  // Generated logical units (require auth context)
  if (ctx) {
    registerAllLogicalUnits(program, ctx);
  }
}
