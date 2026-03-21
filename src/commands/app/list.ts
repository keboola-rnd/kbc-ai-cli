import type { Command } from 'commander';
import { CliContext } from '../../context';
import { formatTable, printError } from '../../output';

export function registerAppList(parent: Command): void {
  parent
    .command('list')
    .description('List all Data Apps in the project')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (opts: { json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const tokenInfo = await ctx.verifyToken();
        const apps = await ctx.listApps(String(tokenInfo.owner.id));

        if (opts.json) {
          console.log(JSON.stringify(apps, null, 2));
          return;
        }

        if (apps.length === 0) {
          console.log('No Data Apps found in this project.');
          return;
        }

        const rows = apps.map((app) => ({
          id: app.id,
          name: app.name ?? '(unnamed)',
          state: app.state,
          url: app.url ?? '',
          configId: app.configId,
          configVersion: app.configVersion,
        }));

        console.log(formatTable(rows));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
