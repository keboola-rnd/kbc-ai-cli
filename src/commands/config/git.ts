import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess, printInfo } from '../../output';

export function registerConfigGit(parent: Command): void {
  parent
    .command('git [app-id]')
    .description('View or update Git settings of a Data App')
    .option('--repo <url>', 'Git repository URL')
    .option('--branch <branch>', 'Git branch')
    .option('--entrypoint <path>', 'Entrypoint file path')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, opts: {
      repo?: string;
      branch?: string;
      entrypoint?: string;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);
        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfiguration(app.configId);

        const isReadOnly = !opts.repo && !opts.branch && !opts.entrypoint;

        if (isReadOnly) {
          // Show current git settings
          const git = config.configuration?.parameters?.dataApp?.git;
          if (opts.json) {
            console.log(JSON.stringify(git ?? {}, null, 2));
          } else if (git?.repository) {
            printInfo(`Repository:  ${git.repository}`);
            printInfo(`Branch:      ${git.branch ?? 'N/A'}`);
            printInfo(`Entrypoint:  ${git.entrypoint ?? 'N/A'}`);
          } else {
            printInfo('No Git configuration set (app uses inline script).');
          }
          return;
        }

        // Update git settings
        const currentConfig = config.configuration ?? {};
        const currentParams = currentConfig.parameters ?? {};
        const currentDataApp = currentParams.dataApp ?? {};
        const currentGit = currentDataApp.git ?? {};

        const updatedGit = { ...currentGit };
        if (opts.repo) updatedGit.repository = opts.repo;
        if (opts.branch) updatedGit.branch = opts.branch;
        if (opts.entrypoint) updatedGit.entrypoint = opts.entrypoint;

        const updatedConfig = {
          ...currentConfig,
          parameters: {
            ...currentParams,
            dataApp: {
              ...currentDataApp,
              git: updatedGit,
            },
          },
        };

        const changes: string[] = [];
        if (opts.repo) changes.push(`repo=${opts.repo}`);
        if (opts.branch) changes.push(`branch=${opts.branch}`);
        if (opts.entrypoint) changes.push(`entrypoint=${opts.entrypoint}`);

        const result = await ctx.updateConfiguration(app.configId, {
          configuration: JSON.stringify(updatedConfig),
          changeDescription: `CLI config git: ${changes.join(', ')}`,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printSuccess(`Git config updated (version ${result.version}): ${changes.join(', ')}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
