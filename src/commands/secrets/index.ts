import type { Command } from 'commander';
import { registerSecretsList } from './list';
import { registerSecretsSet } from './set';
import { registerSecretsDelete } from './delete';
import { registerSecretsImport } from './import';

export function registerSecretsCommands(program: Command): void {
  const secretsCmd = program.command('secrets').description('Manage Data App secrets');
  registerSecretsList(secretsCmd);
  registerSecretsSet(secretsCmd);
  registerSecretsDelete(secretsCmd);
  registerSecretsImport(secretsCmd);
}
