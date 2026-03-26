import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError } from '../../output';

export function registerRawApi(program: Command): void {
  program
    .command('api')
    .description('Make a raw API call to any Keboola service')
    .argument('<service>', 'Service ID (storage, data-science, encryption, sandboxes, vault, ...)')
    .argument('<method>', 'HTTP method (GET, POST, PUT, PATCH, DELETE)')
    .argument('<path>', 'API path (e.g., /apps)')
    .option('--data <json>', 'Request body as JSON string')
    .option('--data-file <file>', 'Request body from file')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (service: string, method: string, path: string, opts: {
      data?: string;
      dataFile?: string;
      stack?: string;
      token?: string;
    }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig(opts);

        let body: string | undefined;
        if (opts.data) {
          body = opts.data;
        } else if (opts.dataFile) {
          const { readFileSync } = await import('node:fs');
          body = readFileSync(opts.dataFile, 'utf-8');
        }

        const result = await ctx.rawApi(service, method, path, body);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
