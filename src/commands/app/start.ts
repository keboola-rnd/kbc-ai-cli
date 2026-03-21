import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess, printInfo } from '../../output';

export function registerAppStart(parent: Command): void {
  parent
    .command('start [app-id]')
    .description('Start a stopped Data App')
    .option('--wait', 'Wait for app to be running')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { wait?: boolean; json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);
        const result = await ctx.patchApp(resolvedAppId, {
          desiredState: 'running',
          configVersion: app.configVersion,
        });

        if (!opts.wait) {
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printSuccess(`App ${resolvedAppId} start requested. State: ${result.state}`);
          }
          return;
        }

        // Wait for running state
        printInfo('Waiting for app to start...');
        const maxWaitMs = 5 * 60 * 1000;
        const startTime = Date.now();
        const pollInterval = 2000;

        while (Date.now() - startTime < maxWaitMs) {
          const current = await ctx.getApp(resolvedAppId);

          if (current.state === 'running') {
            if (opts.json) {
              console.log(JSON.stringify(current, null, 2));
            } else {
              printSuccess(`App is running!`);
              if (current.url) {
                printInfo(`URL: ${current.url}`);
              }
            }
            return;
          }

          if (current.state === 'error' || current.state === 'failed') {
            printError(`App failed to start. State: ${current.state}`);
            process.exit(1);
          }

          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        printError('Start timed out.');
        process.exit(1);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
