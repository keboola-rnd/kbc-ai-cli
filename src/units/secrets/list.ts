import type { Command } from 'commander';
import { CliContext } from '../../context';
import { formatTable, printError, printInfo } from '../../output';

export function registerSecretsList(parent: Command): void {
  parent
    .command('list [app-id]')
    .description('List all secrets of a Data App')
    .option('--show-values', 'Show actual values (encrypted values remain masked)')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: {
      showValues?: boolean;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfigurationLegacy(app.configId);
        const secrets = config.configuration?.parameters?.dataApp?.secrets ?? {};

        const entries = Object.entries(secrets);

        if (entries.length === 0) {
          printInfo('No secrets defined.');
          return;
        }

        if (opts.json) {
          const output = opts.showValues
            ? secrets
            : Object.fromEntries(entries.map(([k, v]) => [k, k.startsWith('#') ? '********' : v]));
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        const rows = entries.map(([key, value]) => ({
          key,
          value: opts.showValues
            ? (key.startsWith('#') ? '(encrypted)' : value)
            : (key.startsWith('#') ? '********' : value),
          encrypted: key.startsWith('#') ? 'yes' : 'no',
        }));

        console.log(formatTable(rows));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
