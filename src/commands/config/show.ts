import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerConfigShow(parent: Command): void {
  parent
    .command('show [app-id]')
    .description('Show the full configuration of a Data App')
    .option('--json', 'Output as JSON (default)')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        // Get app to find configId
        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfiguration(app.configId);

        // Config show always outputs JSON for machine readability
        console.log(JSON.stringify(config.configuration, null, 2));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
