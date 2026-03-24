import type { Command } from 'commander';
import { CliContext } from '../../context';
import { formatTable, printError } from '../../output';

export function registerConfigList(parent: Command): void {
  parent
    .command('configs <component-id>')
    .description('List all configurations for a component')
    .option('--json', 'Output as JSON')
    .option('--branch-id <branchId>', 'Branch ID (default: "default")', 'default')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (componentId: string, opts: {
      json?: boolean;
      branchId?: string;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const api = ctx.storageApi() as Record<string, unknown>;
        const configs = api['componentsAndConfigurations'] as Record<string, unknown>;

        const result = await (configs['_call'] as Function)(
          'getConfigurations', 'GET',
          '/branch/{branchId}/components/{0}/configs', 1,
          componentId,
          { branchId: opts.branchId },
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const items = Array.isArray(result) ? result : [];
        if (items.length === 0) {
          console.log(`No configurations found for component ${componentId}.`);
          return;
        }

        const rows = items.map((c: Record<string, unknown>) => ({
          id: c['id'] ?? '',
          name: c['name'] ?? '',
          description: String(c['description'] ?? '').slice(0, 60),
          version: c['version'] ?? '',
          created: c['created'] ?? '',
        }));

        console.log(formatTable(rows));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
