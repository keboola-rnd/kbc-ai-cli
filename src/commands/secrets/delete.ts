import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerSecretsDelete(parent: Command): void {
  parent
    .command('delete [app-id]')
    .description('Delete secret(s) from a Data App')
    .argument('<keys...>', 'Secret key(s) to delete')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, keys: string[], opts: {
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfiguration(app.configId);
        const currentConfig = config.configuration ?? {};
        const currentParams = currentConfig.parameters ?? {};
        const currentDataApp = currentParams.dataApp ?? {};
        const currentSecrets = { ...currentDataApp.secrets ?? {} };

        const deleted: string[] = [];
        for (const key of keys) {
          if (key in currentSecrets) {
            delete currentSecrets[key];
            deleted.push(key);
          } else if (`#${key}` in currentSecrets) {
            delete currentSecrets[`#${key}`];
            deleted.push(`#${key}`);
          }
        }

        if (deleted.length === 0) {
          printError(`No matching secrets found for: ${keys.join(', ')}`);
          process.exit(1);
        }

        const updatedConfig = {
          ...currentConfig,
          parameters: {
            ...currentParams,
            dataApp: {
              ...currentDataApp,
              secrets: currentSecrets,
            },
          },
        };

        const result = await ctx.updateConfiguration(app.configId, {
          configuration: JSON.stringify(updatedConfig),
          changeDescription: `CLI secrets delete: ${deleted.join(', ')}`,
        });

        if (opts.json) {
          console.log(JSON.stringify({ deleted, version: result.version }, null, 2));
        } else {
          printSuccess(`Secrets deleted (version ${result.version}): ${deleted.join(', ')}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
