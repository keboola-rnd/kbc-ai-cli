import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerRunsShow(parent: Command): void {
  parent
    .command('show [app-id]')
    .description('Show details of a specific run')
    .argument('<run-id>', 'Run ID')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, runId: string, opts: {
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const run = await ctx.getAppRun(resolvedAppId, runId) as {
          id: string;
          appId: string;
          state: string;
          configVersion: string;
          startedAt: string;
          finishedAt?: string;
          startupLogs?: string;
        };

        if (opts.json) {
          console.log(JSON.stringify(run, null, 2));
          return;
        }

        printInfo(`Run ID:          ${run.id}`);
        printInfo(`App ID:          ${run.appId}`);
        printInfo(`State:           ${run.state}`);
        printInfo(`Config Version:  ${run.configVersion}`);
        printInfo(`Started:         ${run.startedAt}`);
        printInfo(`Finished:        ${run.finishedAt ?? 'N/A'}`);

        if (run.startupLogs) {
          console.log('\n--- Startup Logs ---');
          console.log(run.startupLogs);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
