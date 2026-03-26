import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo, printWarning } from '../../output';

export function registerAppLogs(parent: Command): void {
  parent
    .command('logs [app-id]')
    .description('View or stream Data App logs')
    .option('--follow', 'Stream logs in real-time')
    .option('--tail <lines>', 'Show last N lines', '100')
    .option('--download', 'Download full logs')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: {
      follow?: boolean;
      tail?: string;
      download?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        // Download mode: get full logs
        if (opts.download) {
          const logs = await ctx.getAppLogsDownload(resolvedAppId);
          process.stdout.write(logs);
          return;
        }

        // Tail / follow mode
        const lines = parseInt(opts.tail ?? '100', 10);
        const result = await ctx.getAppLogsTail(resolvedAppId, { lines });

        if (result.logs) {
          process.stdout.write(result.logs);
          if (!result.logs.endsWith('\n')) {
            process.stdout.write('\n');
          }
        } else {
          printWarning('No logs available (app may not be running).');
        }

        if (!opts.follow) return;

        // Follow mode: keep polling
        printInfo('--- following logs (Ctrl+C to stop) ---');
        let since = result.nextLogTimestamp;
        const pollInterval = 2000;

        const poll = async () => {
          while (true) {
            try {
              const logResult = await ctx.getAppLogsTail(resolvedAppId, {
                since: since ?? undefined,
              });

              if (logResult.logs) {
                process.stdout.write(logResult.logs);
                if (!logResult.logs.endsWith('\n')) {
                  process.stdout.write('\n');
                }
              }

              if (logResult.nextLogTimestamp) {
                since = logResult.nextLogTimestamp;
              }
            } catch (error) {
              // Silently retry on transient errors
              if (error instanceof Error && error.message.includes('400')) {
                printWarning('App stopped. Waiting for restart...');
              }
            }

            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        };

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
          printInfo('\nStopped following logs.');
          process.exit(0);
        });

        await poll();
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
