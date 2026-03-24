import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printInfo } from '../../output';

export function registerComponentInfo(parent: Command): void {
  parent
    .command('info <component-id>')
    .description('Show detailed information about a component')
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
          'getComponent', 'GET',
          '/branch/{branchId}/components/{0}', 1,
          componentId,
          { branchId: opts.branchId },
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const c = result as Record<string, unknown>;
        printInfo(`Component ID:    ${c['id'] ?? ''}`);
        printInfo(`Name:            ${c['name'] ?? ''}`);
        printInfo(`Type:            ${c['type'] ?? ''}`);

        const data = c['data'] as Record<string, unknown> | undefined;
        if (data) {
          printInfo(`Description:     ${(data['definition'] as Record<string, unknown>)?.['description'] ?? ''}`);
        }
        if (c['flags'] && Array.isArray(c['flags'])) {
          printInfo(`Flags:           ${(c['flags'] as string[]).join(', ')}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
