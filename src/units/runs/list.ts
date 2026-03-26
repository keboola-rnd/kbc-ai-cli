import type { Command } from 'commander';
import { CliContext } from '../../context';
import { formatTable, printError, printInfo } from '../../output';

export function registerRunsList(parent: Command): void {
  parent
    .command('list [app-id]')
    .description('List deployment runs of a Data App')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const runs = await ctx.getAppRuns(resolvedAppId) as Array<{
          id: string;
          state: string;
          configVersion: string;
          startedAt: string;
          finishedAt?: string;
        }>;

        if (opts.json) {
          console.log(JSON.stringify(runs, null, 2));
          return;
        }

        if (runs.length === 0) {
          printInfo('No runs found.');
          return;
        }

        const rows = runs.map((run) => ({
          id: run.id,
          state: run.state,
          configVersion: run.configVersion ?? '',
          started: run.startedAt ?? '',
          finished: run.finishedAt ?? '',
        }));

        console.log(formatTable(rows));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
