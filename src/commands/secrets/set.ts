import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerSecretsSet(parent: Command): void {
  parent
    .command('set [app-id]')
    .description('Set a secret on a Data App (KEY=VALUE)')
    .argument('<pairs...>', 'Key-value pairs (KEY=VALUE)')
    .option('--encrypt', 'Encrypt the value(s) before storing')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, pairs: string[], opts: {
      encrypt?: boolean;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        // Parse KEY=VALUE pairs
        const newSecrets: Record<string, string> = {};
        for (const pair of pairs) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx === -1) {
            printError(`Invalid format: "${pair}". Use KEY=VALUE.`);
            process.exit(1);
          }
          const key = pair.substring(0, eqIdx);
          const value = pair.substring(eqIdx + 1);
          newSecrets[key] = value;
        }

        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfiguration(app.configId);
        const currentConfig = config.configuration ?? {};
        const currentParams = currentConfig.parameters ?? {};
        const currentDataApp = currentParams.dataApp ?? {};
        const currentSecrets = currentDataApp.secrets ?? {};

        // Encrypt values if requested
        const tokenInfo = await ctx.verifyToken();
        const processedSecrets: Record<string, string> = {};

        for (const [key, value] of Object.entries(newSecrets)) {
          if (opts.encrypt) {
            const encrypted = await ctx.encrypt(value, {
              projectId: String(tokenInfo.owner.id),
              componentId: 'keboola.data-apps',
            });
            processedSecrets[`#${key}`] = encrypted;
          } else {
            processedSecrets[key] = value;
          }
        }

        const mergedSecrets = { ...currentSecrets, ...processedSecrets };

        const updatedConfig = {
          ...currentConfig,
          parameters: {
            ...currentParams,
            dataApp: {
              ...currentDataApp,
              secrets: mergedSecrets,
            },
          },
        };

        const result = await ctx.updateConfiguration(app.configId, {
          configuration: JSON.stringify(updatedConfig),
          changeDescription: `CLI secrets set: ${Object.keys(processedSecrets).join(', ')}`,
        });

        if (opts.json) {
          console.log(JSON.stringify({ updated: Object.keys(processedSecrets), version: result.version }, null, 2));
        } else {
          printSuccess(`Secrets set (version ${result.version}): ${Object.keys(processedSecrets).join(', ')}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
