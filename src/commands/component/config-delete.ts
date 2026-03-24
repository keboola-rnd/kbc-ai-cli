import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerConfigDelete(parent: Command): void {
  parent
    .command('delete-config <component-id> <config-id>')
    .description('Delete a configuration')
    .option('--branch-id <branchId>', 'Branch ID (default: "default")', 'default')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (componentId: string, configId: string, opts: {
      branchId?: string;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const api = ctx.storageApi() as Record<string, unknown>;
        const configs = api['componentsAndConfigurations'] as Record<string, unknown>;

        await (configs['_call'] as Function)(
          'deleteConfiguration', 'DELETE',
          '/branch/{branchId}/components/{0}/configs/{1}', 2,
          componentId, configId,
          { branchId: opts.branchId },
        );

        if (opts.json) {
          console.log(JSON.stringify({ deleted: true, componentId, configId }));
          return;
        }

        printSuccess(`Configuration ${configId} deleted from component ${componentId}.`);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
