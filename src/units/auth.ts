import type { Command } from 'commander';
import { CliContext } from '../context';
import { loadConfig, setProfile } from '../config';
import { printSuccess, printError, printInfo, formatTable } from '../output';

export function registerAuth(program: Command): void {
  const authCmd = program
    .command('auth')
    .description('Authenticate with Keboola stack');

  authCmd
    .command('login')
    .description('Authenticate with a Keboola stack')
    .requiredOption('--stack <url>', 'Keboola stack URL (e.g., https://connection.keboola.com)')
    .requiredOption('--token <token>', 'Storage API token')
    .option('--profile <name>', 'Profile name', 'default')
    .action(async (opts: { stack: string; token: string; profile: string }) => {
      try {
        // Verify the token works
        const ctx = new CliContext(opts.stack, opts.token);
        const tokenInfo = await ctx.verifyToken();

        setProfile(opts.profile, {
          stackUrl: opts.stack,
          token: opts.token,
        });

        printSuccess(
          `Authenticated as "${tokenInfo.admin.name}" in project "${tokenInfo.owner.name}" (profile: ${opts.profile})`,
        );
      } catch (error) {
        printError(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  authCmd
    .command('status')
    .description('Show current authentication status')
    .option('--json', 'Output as JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        const ctx = CliContext.fromEnvOrConfig();
        const tokenInfo = await ctx.verifyToken();

        const data = {
          stack: ctx.stackUrl,
          user: tokenInfo.admin.name,
          project: tokenInfo.owner.name,
          projectId: tokenInfo.owner.id,
          tokenId: tokenInfo.id,
          isMasterToken: tokenInfo.isMasterToken,
        };

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          printInfo(`Stack:     ${data.stack}`);
          printInfo(`User:      ${data.user}`);
          printInfo(`Project:   ${data.project} (ID: ${data.projectId})`);
          printInfo(`Token:     ${data.tokenId} (master: ${data.isMasterToken})`);
        }
      } catch (error) {
        printError(`Not authenticated: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  authCmd
    .command('list')
    .description('List saved profiles')
    .action(() => {
      const config = loadConfig();
      const profiles = Object.entries(config.profiles);
      if (profiles.length === 0) {
        printInfo('No profiles saved. Run: kbc-app auth login --stack <URL> --token <TOKEN>');
        return;
      }
      const rows = profiles.map(([name, p]) => ({
        name,
        stack: p.stackUrl,
        active: name === config.currentProfile ? '*' : '',
      }));
      console.log(formatTable(rows));
    });

  // Shortcut: kbc-app auth --stack --token (same as kbc-app auth login)
  authCmd
    .option('--stack <url>', 'Keboola stack URL')
    .option('--token <token>', 'Storage API token')
    .option('--profile <name>', 'Profile name', 'default')
    .action(async (opts: { stack?: string; token?: string; profile?: string }) => {
      if (opts.stack && opts.token) {
        try {
          const ctx = new CliContext(opts.stack, opts.token);
          const tokenInfo = await ctx.verifyToken();
          setProfile(opts.profile ?? 'default', {
            stackUrl: opts.stack,
            token: opts.token,
          });
          printSuccess(
            `Authenticated as "${tokenInfo.admin.name}" in project "${tokenInfo.owner.name}"`,
          );
        } catch (error) {
          printError(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }
    });
}
