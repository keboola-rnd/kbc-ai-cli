import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess, printWarning } from '../../output';

export function registerAppDelete(parent: Command): void {
  parent
    .command('delete [app-id]')
    .description('Delete a Data App')
    .option('--force', 'Skip confirmation')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { force?: boolean; json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        if (!opts.force) {
          // Get app info for confirmation
          const app = await ctx.getApp(resolvedAppId);
          printWarning(`About to delete app: ${app.name ?? resolvedAppId} (${resolvedAppId})`);
          printWarning('Use --force to skip this check.');

          // Read from stdin for confirmation
          const readline = await import('node:readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) => {
            rl.question('Type app ID to confirm deletion: ', resolve);
          });
          rl.close();

          if (answer !== resolvedAppId) {
            printError('Deletion cancelled (ID did not match).');
            process.exit(1);
          }
        }

        await ctx.deleteApp(resolvedAppId);

        if (opts.json) {
          console.log(JSON.stringify({ deleted: resolvedAppId }));
        } else {
          printSuccess(`App ${resolvedAppId} deleted.`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
