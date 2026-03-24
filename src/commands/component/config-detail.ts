import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerConfigDetail(parent: Command): void {
  parent
    .command('config <component-id> <config-id>')
    .description('Show detailed information about a configuration')
    .option('--json', 'Output as JSON')
    .option('--branch-id <branchId>', 'Branch ID (default: "default")', 'default')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (componentId: string, configId: string, opts: {
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
          'getConfiguration', 'GET',
          '/branch/{branchId}/components/{0}/configs/{1}', 2,
          componentId, configId,
          { branchId: opts.branchId },
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const c = result as Record<string, unknown>;
        printInfo(`Config ID:       ${c['id'] ?? ''}`);
        printInfo(`Name:            ${c['name'] ?? ''}`);
        printInfo(`Description:     ${c['description'] ?? ''}`);
        printInfo(`Component:       ${componentId}`);
        printInfo(`Version:         ${c['version'] ?? ''}`);
        printInfo(`Created:         ${c['created'] ?? ''}`);

        const configuration = c['configuration'] as Record<string, unknown> | undefined;
        if (configuration) {
          const params = configuration['parameters'] as Record<string, unknown> | undefined;
          if (params) {
            printInfo('');
            printInfo('--- Parameters ---');
            printInfo(JSON.stringify(params, null, 2));
          }
        }

        const rows = c['rows'] as unknown[] | undefined;
        if (rows && rows.length > 0) {
          printInfo('');
          printInfo(`Rows:            ${rows.length} row(s)`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
