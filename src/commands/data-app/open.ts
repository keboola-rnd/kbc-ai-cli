import { exec } from 'node:child_process';
import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerAppOpen(parent: Command): void {
  parent
    .command('open [app-id]')
    .description('Open Data App in browser')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);

        if (!app.url) {
          printError('App has no URL (might not be deployed yet).');
          process.exit(1);
        }

        printInfo(`Opening: ${app.url}`);

        // Detect platform and open browser
        const platform = process.platform;
        const openCmd =
          platform === 'darwin' ? 'open' :
          platform === 'win32' ? 'start' :
          'xdg-open';

        exec(`${openCmd} ${app.url}`, (error) => {
          if (error) {
            printInfo(`Could not open browser. URL: ${app.url}`);
          }
        });
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
