import { readFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import { CliContext } from '../../context';
import { printError, printSuccess, printInfo } from '../../output';

export function registerSecretsImport(parent: Command): void {
  parent
    .command('import [app-id]')
    .description('Import secrets from a .env file')
    .argument('<file>', 'Path to .env file')
    .option('--encrypt', 'Encrypt all values')
    .option('--replace', 'Replace all existing secrets (default: merge)')
    .option('--json', 'Output as JSON')
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .action(async (appId: string | undefined, file: string, opts: {
      encrypt?: boolean;
      replace?: boolean;
      json?: boolean;
      stack?: string;
      token?: string;
    }) => {
      try {
        if (!existsSync(file)) {
          printError(`File not found: ${file}`);
          process.exit(1);
        }

        const ctx = CliContext.fromEnvOrConfig(opts);
        const resolvedAppId = ctx.resolveAppId(appId);

        // Parse .env file
        const content = readFileSync(file, 'utf-8');
        const newSecrets: Record<string, string> = {};

        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;

          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;

          let key = trimmed.substring(0, eqIdx).trim();
          let value = trimmed.substring(eqIdx + 1).trim();

          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          // Remove export prefix
          if (key.startsWith('export ')) {
            key = key.substring(7).trim();
          }

          newSecrets[key] = value;
        }

        const count = Object.keys(newSecrets).length;
        if (count === 0) {
          printError('No valid key-value pairs found in file.');
          process.exit(1);
        }

        printInfo(`Found ${count} secrets in ${file}`);

        const app = await ctx.getApp(resolvedAppId);
        const config = await ctx.getConfiguration(app.configId);
        const currentConfig = config.configuration ?? {};
        const currentParams = currentConfig.parameters ?? {};
        const currentDataApp = currentParams.dataApp ?? {};

        // Encrypt if requested
        const processedSecrets: Record<string, string> = {};
        if (opts.encrypt) {
          const tokenInfo = await ctx.verifyToken();
          for (const [key, value] of Object.entries(newSecrets)) {
            const encrypted = await ctx.encrypt(value, {
              projectId: String(tokenInfo.owner.id),
              componentId: 'keboola.data-apps',
            });
            processedSecrets[`#${key}`] = encrypted;
          }
        } else {
          Object.assign(processedSecrets, newSecrets);
        }

        const mergedSecrets = opts.replace
          ? processedSecrets
          : { ...currentDataApp.secrets ?? {}, ...processedSecrets };

        const updatedConfig = {
          ...currentConfig,
          parameters: {
            ...currentParams,
            dataApp: {
              ...currentDataApp,
              secrets: mergedSecrets,
            },
          },
        };

        const result = await ctx.updateConfiguration(app.configId, {
          configuration: JSON.stringify(updatedConfig),
          changeDescription: `CLI secrets import from ${file} (${count} secrets)`,
        });

        if (opts.json) {
          console.log(JSON.stringify({
            imported: Object.keys(processedSecrets),
            version: result.version,
          }, null, 2));
        } else {
          printSuccess(`${count} secrets imported (version ${result.version})`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
