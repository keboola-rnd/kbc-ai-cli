import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerAppInfo(parent: Command): void {
  parent
    .command('info [app-id]')
    .description('Show detailed information about a Data App')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: { json?: boolean; stack?: string; token?: string }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        const app = await ctx.getApp(resolvedAppId);

        // Also fetch configuration if configId is available
        let config = null;
        if (app.configId) {
          try {
            config = await ctx.getConfigurationLegacy(app.configId);
          } catch {
            // Config might not be accessible
          }
        }

        if (opts.json) {
          console.log(JSON.stringify({ app, config }, null, 2));
          return;
        }

        printInfo(`App ID:          ${app.id}`);
        printInfo(`Name:            ${app.name ?? '(unnamed)'}`);
        printInfo(`State:           ${app.state}`);
        printInfo(`Desired State:   ${app.desiredState}`);
        printInfo(`URL:             ${app.url ?? 'N/A'}`);
        printInfo(`Config ID:       ${app.configId}`);
        printInfo(`Config Version:  ${app.configVersion}`);
        printInfo(`Project ID:      ${app.projectId}`);
        printInfo(`App Type:        ${app.appType ?? 'N/A'}`);
        printInfo(`Created:         ${app.createdAt}`);
        printInfo(`Updated:         ${app.updatedAt}`);

        if (config) {
          const params = config.configuration?.parameters;
          const dataApp = params?.dataApp;
          console.log('');
          printInfo('--- Configuration ---');
          printInfo(`Size:            ${params?.size ?? 'N/A'}`);
          printInfo(`Auto Suspend:    ${params?.autoSuspendAfterSeconds ? `${params.autoSuspendAfterSeconds}s` : 'N/A'}`);
          printInfo(`Image Version:   ${params?.imageVersion ?? 'N/A'}`);
          printInfo(`Type:            ${dataApp?.type ?? 'N/A'}`);
          printInfo(`Slug:            ${dataApp?.slug ?? 'N/A'}`);

          if (dataApp?.git?.repository) {
            printInfo(`Git Repo:        ${dataApp.git.repository}`);
            printInfo(`Git Branch:      ${dataApp.git.branch ?? 'N/A'}`);
            printInfo(`Git Entrypoint:  ${dataApp.git.entrypoint ?? 'N/A'}`);
          }

          if (params?.script && params.script.length > 0) {
            printInfo(`Script:          (inline, ${params.script.length} block(s))`);
          }

          if (params?.packages && params.packages.length > 0) {
            printInfo(`Packages:        ${params.packages.join(', ')}`);
          }

          const secretCount = dataApp?.secrets ? Object.keys(dataApp.secrets).length : 0;
          printInfo(`Secrets:         ${secretCount} defined`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
