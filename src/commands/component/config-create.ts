import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess } from '../../output';

export function registerConfigCreate(parent: Command): void {
  parent
    .command('create-config <component-id>')
    .description('Create a new configuration for a component')
    .requiredOption('--name <name>', 'Configuration name')
    .option('--description <desc>', 'Configuration description')
    .option('--config <json>', 'Configuration parameters as JSON')
    .option('--json', 'Output as JSON')
    .option('--branch-id <branchId>', 'Branch ID (default: "default")', 'default')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (componentId: string, opts: {
      name: string;
      description?: string;
      config?: string;
      json?: boolean;
      branchId?: string;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const api = ctx.storageApi() as Record<string, unknown>;
        const configs = api['componentsAndConfigurations'] as Record<string, unknown>;

        const body: Record<string, unknown> = {
          name: opts.name,
        };
        if (opts.description) body['description'] = opts.description;
        if (opts.config) {
          body['configuration'] = JSON.parse(opts.config);
        }

        const result = await (configs['_call'] as Function)(
          'createConfiguration', 'POST',
          '/branch/{branchId}/components/{0}/configs', 1,
          componentId,
          { ...body, branchId: opts.branchId },
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const c = result as Record<string, unknown>;
        printSuccess(`Configuration created: ${c['id']} (${c['name']})`);
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
