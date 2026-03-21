import type { Command } from 'commander';
import { setCurrentAppId, getCurrentAppId } from '../config';
import { printSuccess, printInfo } from '../output';

export function registerUse(program: Command): void {
  program
    .command('use [app-id]')
    .description('Set the current Data App context (or show current)')
    .action((appId?: string) => {
      if (appId) {
        setCurrentAppId(appId);
        printSuccess(`Current app set to: ${appId}`);
      } else {
        const current = getCurrentAppId();
        if (current) {
          printInfo(`Current app: ${current}`);
        } else {
          printInfo('No app selected. Run: kbc-app use <app-id>');
        }
      }
    });
}
