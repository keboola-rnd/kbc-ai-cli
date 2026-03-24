import type { Command } from 'commander';
import { CliContext } from '../../context';
import { formatTable, printError } from '../../output';

export function registerComponentList(parent: Command): void {
  parent
    .command('list')
    .description('List all components available in the project')
    .option('--json', 'Output as JSON')
    .option('--type <type>', 'Filter by component type (extractor, writer, transformation, etc.)')
    .option('--include <fields>', 'Include extra data (e.g. configuration)')
    .option('--branch-id <branchId>', 'Branch ID (default: "default")', 'default')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (opts: {
      json?: boolean;
      type?: string;
      include?: string;
      branchId?: string;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);
        const api = ctx.storageApi() as Record<string, unknown>;
        const configs = api['componentsAndConfigurations'] as Record<string, unknown>;

        const query: Record<string, unknown> = {};
        if (opts.branchId) query['branchId'] = opts.branchId;
        if (opts.type) query['componentType'] = opts.type;
        if (opts.include) query['include'] = opts.include;

        const result = await (configs['_call'] as Function)(
          'getComponents', 'GET',
          '/branch/{branchId}/components', 0,
          query,
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const components = Array.isArray(result) ? result : [];
        if (components.length === 0) {
          console.log('No components found.');
          return;
        }

        const rows = components.map((c: Record<string, unknown>) => ({
          id: c['id'] ?? '',
          name: c['name'] ?? '',
          type: c['type'] ?? '',
        }));

        console.log(formatTable(rows));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
