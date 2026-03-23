import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerConfigSet(parent: Command): void {
  parent
    .command('set [app-id]')
    .description('Update configuration parameters of a Data App')
    .option('--size <size>', 'Backend size (tiny/small/medium/large)')
    .option('--timeout <seconds>', 'Auto-suspend timeout in seconds')
    .option('--image-version <version>', 'Runtime image version')
    .option('--slug <slug>', 'App URL slug')
    .option('--name <name>', 'App configuration name')
    .option('--description <desc>', 'App configuration description')
    .option('--json', 'Output updated config as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: {
      size?: string;
      timeout?: string;
      imageVersion?: string;
      slug?: string;
      name?: string;
      description?: string;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfigurationLegacy(app.configId);
        const currentConfig = config.configuration ?? {};
        const currentParams = currentConfig.parameters ?? {};
        const currentDataApp = currentParams.dataApp ?? {};

        const updatedParams = { ...currentParams };
        const updatedDataApp = { ...currentDataApp };

        if (opts.size) updatedParams.size = opts.size;
        if (opts.timeout) updatedParams.autoSuspendAfterSeconds = parseInt(opts.timeout, 10);
        if (opts.imageVersion) updatedParams.imageVersion = opts.imageVersion;
        if (opts.slug) updatedDataApp.slug = opts.slug;

        updatedParams.dataApp = updatedDataApp;

        const changes: string[] = [];
        if (opts.size) changes.push(`size=${opts.size}`);
        if (opts.timeout) changes.push(`timeout=${opts.timeout}s`);
        if (opts.imageVersion) changes.push(`imageVersion=${opts.imageVersion}`);
        if (opts.slug) changes.push(`slug=${opts.slug}`);

        const updatedConfig = { ...currentConfig, parameters: updatedParams };

        const updateBody: {
          configuration: string;
          changeDescription: string;
          name?: string;
          description?: string;
        } = {
          configuration: JSON.stringify(updatedConfig),
          changeDescription: `CLI config set: ${changes.join(', ')}`,
        };

        if (opts.name) updateBody.name = opts.name;
        if (opts.description) updateBody.description = opts.description;

        const result = await ctx.updateConfiguration(app.configId, updateBody);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printSuccess(`Configuration updated (version ${result.version}): ${changes.join(', ')}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
