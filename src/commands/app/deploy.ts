import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess, printInfo, printWarning } from '../../output';

export function registerAppDeploy(parent: Command): void {
  parent
    .command('deploy [app-id]')
    .description('Deploy (or redeploy) a Data App')
    .option('--wait', 'Wait for deployment to complete')
    .option('--follow', 'Follow logs during deployment (implies --wait)')
    .option('--size <size>', 'Set backend size before deploy (tiny/small/medium/large)')
    .option('--timeout <seconds>', 'Set auto-suspend timeout before deploy')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: {
      wait?: boolean;
      follow?: boolean;
      size?: string;
      timeout?: string;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);
        const shouldWait = opts.wait || opts.follow;

        // Get current app to find configId
        const app = await ctx.getApp(resolvedAppId);
        let configVersion = app.configVersion;

        // If size or timeout flags, update configuration first
        if (opts.size || opts.timeout) {
          printInfo('Updating configuration...');
          const config = await ctx.getConfigurationLegacy(app.configId);
          const currentConfig = config.configuration ?? {};
          const currentParams = currentConfig.parameters ?? {};

          const updatedParams = { ...currentParams };
          if (opts.size) {
            updatedParams.size = opts.size;
          }
          if (opts.timeout) {
            updatedParams.autoSuspendAfterSeconds = parseInt(opts.timeout, 10);
          }

          const updatedConfig = {
            ...currentConfig,
            parameters: updatedParams,
          };

          const newConfig = await ctx.updateConfiguration(app.configId, {
            configuration: JSON.stringify(updatedConfig),
            changeDescription: `CLI deploy: ${[opts.size ? `size=${opts.size}` : '', opts.timeout ? `timeout=${opts.timeout}` : ''].filter(Boolean).join(', ')}`,
          });
          configVersion = String(newConfig.version);
          printSuccess(`Configuration updated (version ${configVersion})`);
        }

        // Deploy: patch app with desiredState=running
        printInfo(`Deploying app ${resolvedAppId}...`);
        const patchBody: Record<string, unknown> = {
          desiredState: 'running',
          restartIfRunning: true,
          configVersion,
        };

        const result = await ctx.patchApp(resolvedAppId, patchBody);

        if (!shouldWait) {
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printSuccess(`Deploy triggered. State: ${result.state}`);
            if (result.url) {
              printInfo(`URL: ${result.url}`);
            }
          }
          return;
        }

        // Wait for deployment with optional log following
        printInfo('Waiting for deployment to complete...');
        let lastLogTimestamp: string | null = null;

        const maxWaitMs = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();
        const pollInterval = 2000;

        while (Date.now() - startTime < maxWaitMs) {
          // Check app state
          const current = await ctx.getApp(resolvedAppId);

          // Follow logs if requested
          if (opts.follow) {
            try {
              const logResult = await ctx.getAppLogsTail(resolvedAppId, {
                since: lastLogTimestamp ?? undefined,
              });
              if (logResult.logs) {
                process.stdout.write(logResult.logs);
                if (!logResult.logs.endsWith('\n')) {
                  process.stdout.write('\n');
                }
              }
              if (logResult.nextLogTimestamp) {
                lastLogTimestamp = logResult.nextLogTimestamp;
              }
            } catch {
              // Log fetching might fail during state transitions
            }
          }

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
            printError(`Deploy failed. State: ${current.state}`);
            process.exit(1);
          }

          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        printWarning('Deploy timed out. Check status with: kbc-app app info');
        process.exit(1);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
