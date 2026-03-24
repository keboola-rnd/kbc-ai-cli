import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerAppStop(parent: Command): void {
  parent
    .command('stop [app-id]')
    .description('Stop a running Data App')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const result = await ctx.patchApp(resolvedAppId, {
          desiredState: 'stopped',
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printSuccess(`App ${resolvedAppId} stop requested. State: ${result.state}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
