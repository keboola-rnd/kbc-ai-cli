#!/usr/bin/env bun
/**
 * Contract validator — ensures workflow contracts reference valid atomic methods.
 *
 * Usage: bun run generator/check-workflows.ts
 *
 * Reads workflows/contracts.json and validates every atomicDep against
 * the generated _registry.ts METHOD_MAP.
 */

import * as fs from 'fs';
import * as path from 'path';
import { METHOD_MAP, TOTAL_METHODS } from '../src/generated/_registry';

type WorkflowCommand = {
  description: string;
  atomicDeps: string[];
};

type WorkflowDomain = {
  description: string;
  commands: Record<string, WorkflowCommand>;
};

type ContractsFile = {
  description: string;
  workflows: Record<string, WorkflowDomain>;
};

function main() {
  const contractsPath = path.resolve(import.meta.dir, '../workflows/contracts.json');

  if (!fs.existsSync(contractsPath)) {
    console.error('ERROR: workflows/contracts.json not found');
    process.exit(1);
  }

  const contracts: ContractsFile = JSON.parse(fs.readFileSync(contractsPath, 'utf-8'));
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalDeps = 0;
  let totalWorkflows = 0;

  console.log('Validating workflow contracts...');
  console.log('Registry: ' + String(TOTAL_METHODS) + ' atomic methods\n');

  for (const [domain, domainDef] of Object.entries(contracts.workflows)) {
    const commands = domainDef.commands;
    const cmdCount = Object.keys(commands).length;
    console.log('  Domain: ' + domain + ' (' + String(cmdCount) + ' workflows)');
    totalWorkflows += cmdCount;

    for (const [cmdName, cmdDef] of Object.entries(commands)) {
      for (const dep of cmdDef.atomicDeps) {
        totalDeps++;
        if (!METHOD_MAP.has(dep)) {
          errors.push('[' + domain + '.' + cmdName + '] Unknown atomic method: ' + dep);
        }
      }

      if (cmdDef.atomicDeps.length === 0) {
        warnings.push('[' + domain + '.' + cmdName + '] No atomic dependencies declared');
      }
    }
  }

  console.log('\n  Total: ' + String(totalWorkflows) + ' workflows, ' + String(totalDeps) + ' atomic deps\n');

  for (const w of warnings) {
    console.log('  WARN: ' + w);
  }
  for (const e of errors) {
    console.log('  ERROR: ' + e);
  }

  if (errors.length > 0) {
    console.error('\nContract validation FAILED! ' + String(errors.length) + ' error(s).');
    process.exit(1);
  }

  console.log('Contract validation passed (' + String(warnings.length) + ' warnings).');
}

main();
