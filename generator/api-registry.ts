/**
 * API Registry — declarative description of every api-client method.
 *
 * This is the source of truth for the generator. Each entry describes:
 * - Which service/sub-group the method belongs to
 * - The method name in api-client
 * - The CLI command name and description
 * - Arguments (positional) and options (named flags)
 *
 * The generator reads this registry and outputs Commander.js commands.
 * A separate verifier checks that all methods listed here actually exist in the api-client source.
 */

export type ArgDef = {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number';
};

export type OptionDef = {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  required?: boolean;
  defaultValue?: string | number | boolean;
};

export type MethodDef = {
  /** Method name in api-client (e.g. 'getApp') */
  name: string;
  /** CLI subcommand name (e.g. 'get-app') */
  cliName: string;
  /** Human-readable description */
  description: string;
  /** Positional arguments */
  args: ArgDef[];
  /** Named options (--flags) */
  options: OptionDef[];
  /** HTTP method hint for display */
  httpMethod?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
};

export type SubGroupDef = {
  /** Sub-group name (e.g. 'tables' for storage.tables) */
  name: string;
  /** CLI sub-command name */
  cliName: string;
  description: string;
  /** Source file relative to api-client/src/clients/<service>/ */
  sourceFile: string;
  methods: MethodDef[];
};

export type ServiceDef = {
  /** Service name (e.g. 'data-science') */
  name: string;
  /** CLI top-level command name */
  cliName: string;
  description: string;
  /** Factory function name (e.g. 'createDataScienceClient') */
  factoryFn: string;
  /** Source directory relative to api-client/src/clients/ */
  sourceDir: string;
  /** Main client file */
  clientFile: string;
  /** Whether it requires a token */
  requiresAuth: boolean;
  /** Direct methods on the client (not in sub-groups) */
  methods: MethodDef[];
  /** Nested sub-groups (e.g. storage.tables, storage.buckets) */
  subGroups: SubGroupDef[];
};

// ─── Helper to convert camelCase to kebab-case ────────────────────────
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ─── Data Science ─────────────────────────────────────────────────────
const dataScience: ServiceDef = {
  name: 'data-science',
  cliName: 'data-science',
  description: 'Data Science API — Data Apps, runtimes, logs',
  factoryFn: 'createDataScienceClient',
  sourceDir: 'dataScience',
  clientFile: 'dataScienceClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getApps',
      cliName: 'get-apps',
      description: 'List data apps',
      httpMethod: 'GET',
      args: [],
      options: [
        { name: 'component-id', description: 'Filter by component ID', type: 'string' },
        { name: 'limit', description: 'Max results', type: 'number' },
        { name: 'offset', description: 'Pagination offset', type: 'number' },
      ],
    },
    {
      name: 'getApp',
      cliName: 'get-app',
      description: 'Get data app details',
      httpMethod: 'GET',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'createApp',
      cliName: 'create-app',
      description: 'Create a new data app',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Request body as JSON', type: 'json', required: true }],
    },
    {
      name: 'patchApp',
      cliName: 'patch-app',
      description: 'Update a data app (partial)',
      httpMethod: 'PATCH',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Request body as JSON', type: 'json', required: true }],
    },
    {
      name: 'deleteApp',
      cliName: 'delete-app',
      description: 'Delete a data app',
      httpMethod: 'DELETE',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getAppPassword',
      cliName: 'get-app-password',
      description: 'Get data app password',
      httpMethod: 'GET',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'resetAppPassword',
      cliName: 'reset-app-password',
      description: 'Reset data app password',
      httpMethod: 'POST',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getAppRuns',
      cliName: 'get-app-runs',
      description: 'List data app runs',
      httpMethod: 'GET',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [
        { name: 'limit', description: 'Max results', type: 'number' },
        { name: 'offset', description: 'Pagination offset', type: 'number' },
      ],
    },
    {
      name: 'getAppRun',
      cliName: 'get-app-run',
      description: 'Get data app run detail',
      httpMethod: 'GET',
      args: [
        { name: 'appId', description: 'App ID', required: true, type: 'string' },
        { name: 'runId', description: 'Run ID', required: true, type: 'string' },
      ],
      options: [],
    },
    {
      name: 'getAppLogsTail',
      cliName: 'get-app-logs-tail',
      description: 'Get live log tail for a data app',
      httpMethod: 'GET',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [
        { name: 'since', description: 'Logs since timestamp (ISO)', type: 'string' },
        { name: 'lines', description: 'Number of lines', type: 'number' },
      ],
    },
    {
      name: 'getAppLogsDownload',
      cliName: 'get-app-logs-download',
      description: 'Download full logs for a data app',
      httpMethod: 'GET',
      args: [{ name: 'appId', description: 'App ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getRuntimes',
      cliName: 'get-runtimes',
      description: 'List available runtimes',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── Storage ──────────────────────────────────────────────────────────
const storage: ServiceDef = {
  name: 'storage',
  cliName: 'storage',
  description: 'Storage API — tables, buckets, components, configs, branches, files, jobs',
  factoryFn: 'createStorageClient',
  sourceDir: 'storage',
  clientFile: 'storageClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getStackInfo',
      cliName: 'info',
      description: 'Get stack info (services, features, components)',
      httpMethod: 'GET',
      args: [],
      options: [{ name: 'exclude', description: 'Exclude sections (e.g. componentDetails)', type: 'string' }],
    },
  ],
  subGroups: [
    {
      name: 'tables',
      cliName: 'tables',
      description: 'Table operations',
      sourceFile: 'tables/tables.ts',
      methods: [
        {
          name: 'getTables',
          cliName: 'list',
          description: 'List all tables',
          httpMethod: 'GET',
          args: [],
          options: [{ name: 'include', description: 'Include extra data (columns,metadata)', type: 'string' }],
        },
        {
          name: 'getTable',
          cliName: 'get',
          description: 'Get table detail',
          httpMethod: 'GET',
          args: [{ name: 'tableId', description: 'Table ID (e.g. in.c-main.users)', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'getDataPreview',
          cliName: 'preview',
          description: 'Preview table data',
          httpMethod: 'GET',
          args: [{ name: 'tableId', description: 'Table ID', required: true, type: 'string' }],
          options: [
            { name: 'limit', description: 'Max rows', type: 'number' },
            { name: 'format', description: 'Output format (json)', type: 'string', defaultValue: 'json' },
          ],
        },
        {
          name: 'deleteTableRows',
          cliName: 'delete-rows',
          description: 'Delete rows from a table',
          httpMethod: 'DELETE',
          args: [{ name: 'tableId', description: 'Table ID', required: true, type: 'string' }],
          options: [{ name: 'data', description: 'Filter query as JSON', type: 'json' }],
        },
      ],
    },
    {
      name: 'buckets',
      cliName: 'buckets',
      description: 'Bucket operations',
      sourceFile: 'buckets/buckets.ts',
      methods: [
        {
          name: 'getBuckets',
          cliName: 'list',
          description: 'List all buckets',
          httpMethod: 'GET',
          args: [],
          options: [{ name: 'include', description: 'Include extra data', type: 'string' }],
        },
        {
          name: 'getBucket',
          cliName: 'get',
          description: 'Get bucket detail',
          httpMethod: 'GET',
          args: [{ name: 'bucketId', description: 'Bucket ID', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'createBucket',
          cliName: 'create',
          description: 'Create a new bucket',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Bucket definition as JSON', type: 'json', required: true }],
        },
        {
          name: 'updateBucket',
          cliName: 'update',
          description: 'Update a bucket',
          httpMethod: 'PATCH',
          args: [{ name: 'bucketId', description: 'Bucket ID', required: true, type: 'string' }],
          options: [{ name: 'data', description: 'Update data as JSON', type: 'json', required: true }],
        },
        {
          name: 'deleteBucket',
          cliName: 'delete',
          description: 'Delete a bucket',
          httpMethod: 'DELETE',
          args: [{ name: 'bucketId', description: 'Bucket ID', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'createScheduledRefresh',
          cliName: 'schedule-refresh',
          description: 'Create a scheduled refresh for a bucket',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Schedule config as JSON (branchId, bucketId, cronExpression)', type: 'json', required: true }],
        },
        {
          name: 'deleteScheduledTask',
          cliName: 'delete-scheduled-task',
          description: 'Delete a scheduled task',
          httpMethod: 'DELETE',
          args: [{ name: 'taskId', description: 'Scheduled task ID', required: true, type: 'string' }],
          options: [],
        },
      ],
    },
    {
      name: 'componentsAndConfigurations',
      cliName: 'configs',
      description: 'Components and configuration operations',
      sourceFile: 'componentsAndConfigurations/componentsAndConfigurations.ts',
      methods: [
        {
          name: 'getComponents',
          cliName: 'components',
          description: 'List components',
          httpMethod: 'GET',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID (default: "default")', type: 'string', defaultValue: 'default' },
            { name: 'type', description: 'Filter by component type', type: 'string' },
            { name: 'include', description: 'Include extra data', type: 'string' },
          ],
        },
        {
          name: 'getComponent',
          cliName: 'component',
          description: 'Get component detail',
          httpMethod: 'GET',
          args: [{ name: 'componentId', description: 'Component ID', required: true, type: 'string' }],
          options: [{ name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' }],
        },
        {
          name: 'getConfigurations',
          cliName: 'list',
          description: 'List configurations for a component',
          httpMethod: 'GET',
          args: [{ name: 'componentId', description: 'Component ID', required: true, type: 'string' }],
          options: [{ name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' }],
        },
        {
          name: 'getConfiguration',
          cliName: 'get',
          description: 'Get configuration detail',
          httpMethod: 'GET',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
          ],
          options: [{ name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' }],
        },
        {
          name: 'createConfiguration',
          cliName: 'create',
          description: 'Create a configuration',
          httpMethod: 'POST',
          args: [{ name: 'componentId', description: 'Component ID', required: true, type: 'string' }],
          options: [
            { name: 'data', description: 'Configuration as JSON', type: 'json', required: true },
            { name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' },
          ],
        },
        {
          name: 'deleteConfiguration',
          cliName: 'delete',
          description: 'Delete a configuration',
          httpMethod: 'DELETE',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
          ],
          options: [{ name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' }],
        },
        {
          name: 'searchComponentConfigurations',
          cliName: 'search',
          description: 'Search component configurations',
          httpMethod: 'GET',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' },
            { name: 'component-id', description: 'Filter by component ID', type: 'string' },
            { name: 'config-id', description: 'Filter by config ID', type: 'string' },
            { name: 'query', description: 'Search query', type: 'string' },
          ],
        },
        {
          name: 'getConfigurationWorkspaces',
          cliName: 'workspaces',
          description: 'List configuration workspaces',
          httpMethod: 'GET',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
          ],
          options: [{ name: 'branch-id', description: 'Branch ID', type: 'string' }],
        },
        {
          name: 'createConfigurationWorkspace',
          cliName: 'create-workspace',
          description: 'Create a workspace for a configuration',
          httpMethod: 'POST',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
          ],
          options: [
            { name: 'data', description: 'Workspace config as JSON', type: 'json', required: true },
            { name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' },
          ],
        },
        {
          name: 'createConfigurationRow',
          cliName: 'create-row',
          description: 'Create a configuration row',
          httpMethod: 'POST',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
          ],
          options: [
            { name: 'data', description: 'Row data as JSON', type: 'json', required: true },
            { name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' },
          ],
        },
        {
          name: 'deleteConfigurationRow',
          cliName: 'delete-row',
          description: 'Delete a configuration row',
          httpMethod: 'DELETE',
          args: [
            { name: 'componentId', description: 'Component ID', required: true, type: 'string' },
            { name: 'configId', description: 'Configuration ID', required: true, type: 'string' },
            { name: 'rowId', description: 'Row ID', required: true, type: 'string' },
          ],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', defaultValue: 'default' },
            { name: 'change-description', description: 'Change description', type: 'string' },
          ],
        },
      ],
    },
    {
      name: 'branches',
      cliName: 'branches',
      description: 'Branch operations',
      sourceFile: 'branches/branches.ts',
      methods: [
        {
          name: 'getDevBranches',
          cliName: 'list',
          description: 'List dev branches',
          httpMethod: 'GET',
          args: [],
          options: [],
        },
        {
          name: 'createDevBranchJob',
          cliName: 'create',
          description: 'Create a dev branch',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Branch definition as JSON (name, description)', type: 'json', required: true }],
        },
        {
          name: 'updateDevBranch',
          cliName: 'update',
          description: 'Update a dev branch',
          httpMethod: 'PUT',
          args: [{ name: 'branchId', description: 'Branch ID', required: true, type: 'number' }],
          options: [{ name: 'data', description: 'Update data as JSON', type: 'json', required: true }],
        },
        {
          name: 'deleteDevBranchJob',
          cliName: 'delete',
          description: 'Delete a dev branch',
          httpMethod: 'DELETE',
          args: [{ name: 'branchId', description: 'Branch ID', required: true, type: 'number' }],
          options: [],
        },
        {
          name: 'getDevBranchMetadata',
          cliName: 'metadata',
          description: 'Get branch metadata',
          httpMethod: 'GET',
          args: [{ name: 'branchId', description: 'Branch ID', required: true, type: 'string' }],
          options: [],
        },
      ],
    },
    {
      name: 'files',
      cliName: 'files',
      description: 'File operations',
      sourceFile: 'files/files.ts',
      methods: [
        {
          name: 'getFiles',
          cliName: 'list',
          description: 'List files',
          httpMethod: 'GET',
          args: [],
          options: [
            { name: 'tags', description: 'Filter by tags', type: 'string' },
            { name: 'limit', description: 'Max results', type: 'number' },
          ],
        },
        {
          name: 'deleteFile',
          cliName: 'delete',
          description: 'Delete a file',
          httpMethod: 'DELETE',
          args: [{ name: 'fileId', description: 'File ID', required: true, type: 'number' }],
          options: [],
        },
        {
          name: 'addFileTag',
          cliName: 'add-tag',
          description: 'Add a tag to a file',
          httpMethod: 'POST',
          args: [
            { name: 'fileId', description: 'File ID', required: true, type: 'number' },
            { name: 'tag', description: 'Tag name', required: true, type: 'string' },
          ],
          options: [],
        },
        {
          name: 'deleteFileTag',
          cliName: 'delete-tag',
          description: 'Delete a tag from a file',
          httpMethod: 'DELETE',
          args: [
            { name: 'fileId', description: 'File ID', required: true, type: 'number' },
            { name: 'tag', description: 'Tag name', required: true, type: 'string' },
          ],
          options: [],
        },
      ],
    },
    {
      name: 'jobs',
      cliName: 'jobs',
      description: 'Storage job operations',
      sourceFile: 'jobs/jobs.ts',
      methods: [
        {
          name: 'getJobs',
          cliName: 'list',
          description: 'List storage jobs',
          httpMethod: 'GET',
          args: [],
          options: [{ name: 'limit', description: 'Max results', type: 'number' }],
        },
        {
          name: 'getJob',
          cliName: 'get',
          description: 'Get storage job detail',
          httpMethod: 'GET',
          args: [{ name: 'jobId', description: 'Job ID', required: true, type: 'number' }],
          options: [],
        },
      ],
    },
    {
      name: 'workspaces',
      cliName: 'workspaces',
      description: 'Workspace operations',
      sourceFile: 'workspaces/workspaces.ts',
      methods: [
        {
          name: 'getWorkspaces',
          cliName: 'list',
          description: 'List workspaces',
          httpMethod: 'GET',
          args: [{ name: 'branchId', description: 'Branch ID', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'getWorkspace',
          cliName: 'get',
          description: 'Get workspace detail',
          httpMethod: 'GET',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', required: true },
            { name: 'workspace-id', description: 'Workspace ID', type: 'string', required: true },
          ],
        },
        {
          name: 'deleteWorkspace',
          cliName: 'delete',
          description: 'Delete a workspace',
          httpMethod: 'DELETE',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', required: true },
            { name: 'workspace-id', description: 'Workspace ID', type: 'string', required: true },
          ],
        },
        {
          name: 'resetWorkspacePassword',
          cliName: 'reset-password',
          description: 'Reset workspace password',
          httpMethod: 'POST',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', required: true },
            { name: 'workspace-id', description: 'Workspace ID', type: 'string', required: true },
          ],
        },
        {
          name: 'setWorkspacePublicKey',
          cliName: 'set-public-key',
          description: 'Set workspace public key (Snowflake only)',
          httpMethod: 'POST',
          args: [],
          options: [
            { name: 'workspace-id', description: 'Workspace ID', type: 'string', required: true },
            { name: 'public-key', description: 'Public key', type: 'string', required: true },
          ],
        },
        {
          name: 'getWorkspaceSaml2Login',
          cliName: 'saml2-login',
          description: 'Get SAML2 login URL for a workspace',
          httpMethod: 'GET',
          args: [],
          options: [
            { name: 'branch-id', description: 'Branch ID', type: 'string', required: true },
            { name: 'workspace-id', description: 'Workspace ID', type: 'string', required: true },
          ],
        },
      ],
    },
    {
      name: 'tokens',
      cliName: 'tokens',
      description: 'Token operations',
      sourceFile: 'tokens/tokens.ts',
      methods: [
        {
          name: 'verify',
          cliName: 'verify',
          description: 'Verify current token',
          httpMethod: 'GET',
          args: [],
          options: [],
        },
      ],
    },
    {
      name: 'mergeRequests',
      cliName: 'merge-requests',
      description: 'Merge request operations',
      sourceFile: 'mergeRequests/mergeRequests.ts',
      methods: [
        {
          name: 'getMergeRequests',
          cliName: 'list',
          description: 'List merge requests',
          httpMethod: 'GET',
          args: [],
          options: [],
        },
      ],
    },
  ],
};

// ─── Vault ────────────────────────────────────────────────────────────
const vault: ServiceDef = {
  name: 'vault',
  cliName: 'vault',
  description: 'Vault API — variables and secrets',
  factoryFn: 'createVaultClient',
  sourceDir: 'vault',
  clientFile: 'vaultClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getVariables',
      cliName: 'list',
      description: 'List variables',
      httpMethod: 'GET',
      args: [],
      options: [{ name: 'config-id', description: 'Filter by configuration ID', type: 'string' }],
    },
    {
      name: 'getVariablesByBranchId',
      cliName: 'by-branch',
      description: 'Get variables by branch ID',
      httpMethod: 'GET',
      args: [{ name: 'branchId', description: 'Branch ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getProjectWideVariables',
      cliName: 'project-wide',
      description: 'Get project-wide variables',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
    {
      name: 'createVariable',
      cliName: 'create',
      description: 'Create a variable',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Variable definition as JSON', type: 'json', required: true }],
    },
    {
      name: 'deleteVariable',
      cliName: 'delete',
      description: 'Delete a variable',
      httpMethod: 'DELETE',
      args: [{ name: 'hash', description: 'Variable hash', required: true, type: 'string' }],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── Management ───────────────────────────────────────────────────────
const management: ServiceDef = {
  name: 'management',
  cliName: 'management',
  description: 'Management API — projects, features, users',
  factoryFn: 'createManagementClient',
  sourceDir: 'management',
  clientFile: 'managementClient.ts',
  requiresAuth: true,
  methods: [],
  subGroups: [
    {
      name: 'projects',
      cliName: 'projects',
      description: 'Project operations',
      sourceFile: 'projects/projects.ts',
      methods: [
        {
          name: 'getProject',
          cliName: 'get',
          description: 'Get project detail',
          httpMethod: 'GET',
          args: [{ name: 'projectId', description: 'Project ID', required: true, type: 'number' }],
          options: [],
        },
        {
          name: 'addProjectFeature',
          cliName: 'add-feature',
          description: 'Add a feature to a project',
          httpMethod: 'POST',
          args: [{ name: 'projectId', description: 'Project ID', required: true, type: 'number' }],
          options: [{ name: 'feature', description: 'Feature name', type: 'string', required: true }],
        },
        {
          name: 'removeProjectFeature',
          cliName: 'remove-feature',
          description: 'Remove a feature from a project',
          httpMethod: 'DELETE',
          args: [{ name: 'projectId', description: 'Project ID', required: true, type: 'number' }],
          options: [{ name: 'feature', description: 'Feature name', type: 'string', required: true }],
        },
        {
          name: 'changeProjectUserRole',
          cliName: 'change-role',
          description: 'Change a user role in a project',
          httpMethod: 'PATCH',
          args: [{ name: 'projectId', description: 'Project ID', required: true, type: 'number' }],
          options: [
            { name: 'user-id', description: 'User ID', type: 'number', required: true },
            { name: 'role', description: 'New role', type: 'string', required: true },
          ],
        },
      ],
    },
    {
      name: 'features',
      cliName: 'features',
      description: 'Feature operations',
      sourceFile: 'features/features.ts',
      methods: [
        {
          name: 'getAllFeatures',
          cliName: 'list',
          description: 'List all features',
          httpMethod: 'GET',
          args: [],
          options: [{ name: 'type', description: 'Filter by type (project, admin)', type: 'string' }],
        },
      ],
    },
    {
      name: 'users',
      cliName: 'users',
      description: 'User operations',
      sourceFile: 'users/users.ts',
      methods: [
        {
          name: 'addUserAdminFeature',
          cliName: 'add-feature',
          description: 'Add an admin feature to a user',
          httpMethod: 'POST',
          args: [{ name: 'userIdOrMail', description: 'User ID or email', required: true, type: 'string' }],
          options: [{ name: 'feature', description: 'Feature name', type: 'string', required: true }],
        },
        {
          name: 'removeUserAdminFeature',
          cliName: 'remove-feature',
          description: 'Remove an admin feature from a user',
          httpMethod: 'DELETE',
          args: [{ name: 'userIdOrMail', description: 'User ID or email', required: true, type: 'string' }],
          options: [{ name: 'feature', description: 'Feature name', type: 'string', required: true }],
        },
      ],
    },
  ],
};

// ─── Queue ─────────────────────────────────────────────────────────────
const queue: ServiceDef = {
  name: 'queue',
  cliName: 'queue',
  description: 'Queue API — job queue operations',
  factoryFn: 'createQueueClient',
  sourceDir: 'queue',
  clientFile: 'queueClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getJob',
      cliName: 'get-job',
      description: 'Get queue job detail',
      httpMethod: 'GET',
      args: [{ name: 'jobId', description: 'Job ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'searchJobs',
      cliName: 'search',
      description: 'Search queue jobs',
      httpMethod: 'GET',
      args: [],
      options: [
        { name: 'status', description: 'Filter by status', type: 'string' },
        { name: 'component', description: 'Filter by component', type: 'string' },
        { name: 'config', description: 'Filter by config', type: 'string' },
        { name: 'limit', description: 'Max results', type: 'number' },
        { name: 'offset', description: 'Pagination offset', type: 'number' },
      ],
    },
  ],
  subGroups: [],
};

// ─── Sandboxes ─────────────────────────────────────────────────────────
const sandboxes: ServiceDef = {
  name: 'sandboxes',
  cliName: 'sandboxes',
  description: 'Sandboxes API — workspace sandboxes',
  factoryFn: 'createSandboxesClient',
  sourceDir: 'sandboxes',
  clientFile: 'sandboxesClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getSandbox',
      cliName: 'get',
      description: 'Get sandbox detail',
      httpMethod: 'GET',
      args: [{ name: 'sandboxId', description: 'Sandbox ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getSandboxes',
      cliName: 'list',
      description: 'List sandboxes',
      httpMethod: 'GET',
      args: [],
      options: [{ name: 'branch-id', description: 'Filter by branch ID', type: 'string' }],
    },
  ],
  subGroups: [],
};

// ─── Editor ────────────────────────────────────────────────────────────
const editor: ServiceDef = {
  name: 'editor',
  cliName: 'editor',
  description: 'SQL Editor API — sessions, queries, table operations',
  factoryFn: 'createEditorClient',
  sourceDir: 'editor',
  clientFile: 'editorClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'createSession',
      cliName: 'create-session',
      description: 'Create an SQL editor session',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Session config as JSON (branchId, componentId, configurationId, loadMode?, loginType?)', type: 'json', required: true }],
    },
    {
      name: 'getSession',
      cliName: 'get-session',
      description: 'Get session detail',
      httpMethod: 'GET',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getSessions',
      cliName: 'list-sessions',
      description: 'List sessions',
      httpMethod: 'GET',
      args: [],
      options: [{ name: 'workspace-id', description: 'Filter by workspace ID', type: 'string' }],
    },
    {
      name: 'getSessionSchema',
      cliName: 'schema',
      description: 'Get session schema',
      httpMethod: 'GET',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [
        { name: 'only-workspace-schema', description: 'Only workspace schema', type: 'string', defaultValue: '1' },
        { name: 'load-tables', description: 'Load tables', type: 'string', defaultValue: '1' },
      ],
    },
    {
      name: 'getSessionCredentials',
      cliName: 'credentials',
      description: 'Get session credentials',
      httpMethod: 'GET',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'createQueryJob',
      cliName: 'run-query',
      description: 'Run a query',
      httpMethod: 'POST',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Query data as JSON', type: 'json', required: true }],
    },
    {
      name: 'tablePreview',
      cliName: 'table-preview',
      description: 'Preview a table in session',
      httpMethod: 'POST',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Preview options as JSON', type: 'json', required: true }],
    },
    {
      name: 'tableDefinition',
      cliName: 'table-definition',
      description: 'Get table DDL definition',
      httpMethod: 'GET',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Options as JSON (table ID, query params)', type: 'json', required: true }],
    },
    {
      name: 'load',
      cliName: 'load',
      description: 'Load data into session',
      httpMethod: 'POST',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Load options as JSON', type: 'json', required: true }],
    },
    {
      name: 'unload',
      cliName: 'unload',
      description: 'Unload data from session',
      httpMethod: 'POST',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [{ name: 'data', description: 'Unload options as JSON', type: 'json' }],
    },
    {
      name: 'getWorkspacePassword',
      cliName: 'workspace-password',
      description: 'Get workspace password for session',
      httpMethod: 'GET',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'resetWorkspacePassword',
      cliName: 'reset-workspace-password',
      description: 'Reset workspace password for session',
      httpMethod: 'POST',
      args: [{ name: 'sessionId', description: 'Session ID', required: true, type: 'string' }],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── Encryption ────────────────────────────────────────────────────────
const encryption: ServiceDef = {
  name: 'encryption',
  cliName: 'encryption',
  description: 'Encryption API — encrypt values and secrets',
  factoryFn: 'createEncryptionClient',
  sourceDir: 'encryption',
  clientFile: 'encryptionClient.ts',
  requiresAuth: false,
  methods: [
    {
      name: 'encrypt',
      cliName: 'encrypt',
      description: 'Encrypt a single value',
      httpMethod: 'POST',
      args: [{ name: 'value', description: 'Value to encrypt', required: true, type: 'string' }],
      options: [
        { name: 'project-id', description: 'Project ID', type: 'string' },
        { name: 'component-id', description: 'Component ID', type: 'string' },
        { name: 'branch-type', description: 'Branch type', type: 'string' },
      ],
    },
    {
      name: 'encryptSecrets',
      cliName: 'encrypt-secrets',
      description: 'Encrypt secrets in a JSON object (keys prefixed with #)',
      httpMethod: 'POST',
      args: [],
      options: [
        { name: 'data', description: 'JSON object with #-prefixed secret keys', type: 'json', required: true },
        { name: 'project-id', description: 'Project ID', type: 'string' },
        { name: 'component-id', description: 'Component ID', type: 'string' },
        { name: 'branch-type', description: 'Branch type', type: 'string' },
      ],
    },
  ],
  subGroups: [],
};

// ─── Chat ──────────────────────────────────────────────────────────────
const chat: ServiceDef = {
  name: 'chat',
  cliName: 'chat',
  description: 'Kai Chat API — AI assistant conversations',
  factoryFn: 'createChatClient',
  sourceDir: 'chat',
  clientFile: 'chatClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'getHistory',
      cliName: 'history',
      description: 'Get chat history',
      httpMethod: 'GET',
      args: [],
      options: [{ name: 'limit', description: 'Max results', type: 'number' }],
    },
    {
      name: 'getChat',
      cliName: 'get',
      description: 'Get a specific chat',
      httpMethod: 'GET',
      args: [{ name: 'chatId', description: 'Chat ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'deleteChat',
      cliName: 'delete',
      description: 'Delete a chat',
      httpMethod: 'DELETE',
      args: [{ name: 'chatId', description: 'Chat ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'createChat',
      cliName: 'create',
      description: 'Create a new chat',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Chat request as JSON', type: 'json', required: true }],
    },
    {
      name: 'getVotes',
      cliName: 'votes',
      description: 'Get votes for a chat',
      httpMethod: 'GET',
      args: [{ name: 'chatId', description: 'Chat ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'submitVote',
      cliName: 'vote',
      description: 'Submit a vote',
      httpMethod: 'PATCH',
      args: [],
      options: [{ name: 'data', description: 'Vote data as JSON', type: 'json', required: true }],
    },
    {
      name: 'getUsage',
      cliName: 'usage',
      description: 'Get AI usage info',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
    {
      name: 'getSuggestions',
      cliName: 'suggestions',
      description: 'Get chat suggestions',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Suggestions request as JSON', type: 'json', required: true }],
    },
    {
      name: 'getAgentSettings',
      cliName: 'agent-settings',
      description: 'Get agent settings',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
    {
      name: 'updateAgentSettings',
      cliName: 'update-agent-settings',
      description: 'Update agent settings',
      httpMethod: 'PATCH',
      args: [],
      options: [{ name: 'data', description: 'Settings as JSON', type: 'json', required: true }],
    },
    {
      name: 'getUserAgentSettings',
      cliName: 'user-settings',
      description: 'Get user agent settings',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
    {
      name: 'updateUserAgentSettings',
      cliName: 'update-user-settings',
      description: 'Update user agent settings',
      httpMethod: 'PATCH',
      args: [],
      options: [{ name: 'data', description: 'Settings as JSON', type: 'json', required: true }],
    },
    {
      name: 'getToolsList',
      cliName: 'tools',
      description: 'List available AI tools',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── AI ────────────────────────────────────────────────────────────────
const ai: ServiceDef = {
  name: 'ai',
  cliName: 'ai',
  description: 'AI Service — describe configurations, explain errors',
  factoryFn: 'createAiClient',
  sourceDir: 'ai',
  clientFile: 'aiClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'describeConfigurationVersion',
      cliName: 'describe-version',
      description: 'Describe a configuration version',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Request as JSON', type: 'json', required: true }],
    },
    {
      name: 'describeConfigurationMerge',
      cliName: 'describe-merge',
      description: 'Describe a configuration merge',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Request as JSON', type: 'json', required: true }],
    },
    {
      name: 'explainError',
      cliName: 'explain-error',
      description: 'Explain an error message using AI',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Error details as JSON', type: 'json', required: true }],
    },
    {
      name: 'describeConfiguration',
      cliName: 'describe-config',
      description: 'Describe a configuration using AI',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Configuration details as JSON', type: 'json', required: true }],
    },
    {
      name: 'suggestComponent',
      cliName: 'suggest-component',
      description: 'Suggest a component using AI',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Suggestion request as JSON', type: 'json', required: true }],
    },
    {
      name: 'feedback',
      cliName: 'feedback',
      description: 'Submit AI feedback',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'Feedback as JSON', type: 'json', required: true }],
    },
  ],
  subGroups: [],
};

// ─── Query Service ─────────────────────────────────────────────────────
const queryService: ServiceDef = {
  name: 'query-service',
  cliName: 'query-service',
  description: 'Query Service — run SQL queries, manage results',
  factoryFn: 'createQueryServiceClient',
  sourceDir: 'queryService',
  clientFile: 'queryServiceClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'createQueryJob',
      cliName: 'create',
      description: 'Create a query job',
      httpMethod: 'POST',
      args: [
        { name: 'branchId', description: 'Branch ID', required: true, type: 'string' },
        { name: 'workspaceId', description: 'Workspace ID', required: true, type: 'string' },
      ],
      options: [{ name: 'data', description: 'Query as JSON', type: 'json', required: true }],
    },
    {
      name: 'cancelQueryJob',
      cliName: 'cancel',
      description: 'Cancel a running query job',
      httpMethod: 'POST',
      args: [{ name: 'queryJobId', description: 'Query job ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getQueryJob',
      cliName: 'get',
      description: 'Get query job detail',
      httpMethod: 'GET',
      args: [{ name: 'queryJobId', description: 'Query job ID', required: true, type: 'string' }],
      options: [],
    },
    {
      name: 'getQueryResults',
      cliName: 'results',
      description: 'Get query results',
      httpMethod: 'GET',
      args: [
        { name: 'queryJobId', description: 'Query job ID', required: true, type: 'string' },
        { name: 'statementId', description: 'Statement ID', required: true, type: 'string' },
      ],
      options: [{ name: 'format', description: 'Output format', type: 'string' }],
    },
    {
      name: 'getQueryHistory',
      cliName: 'history',
      description: 'Get query history',
      httpMethod: 'GET',
      args: [
        { name: 'branchId', description: 'Branch ID', required: true, type: 'string' },
        { name: 'workspaceId', description: 'Workspace ID', required: true, type: 'string' },
      ],
      options: [{ name: 'limit', description: 'Max results', type: 'number' }],
    },
    {
      name: 'exportResults',
      cliName: 'export',
      description: 'Export query results',
      httpMethod: 'GET',
      args: [
        { name: 'queryJobId', description: 'Query job ID', required: true, type: 'string' },
        { name: 'statementId', description: 'Statement ID', required: true, type: 'string' },
      ],
      options: [{ name: 'format', description: 'Export format', type: 'string' }],
    },
  ],
  subGroups: [],
};

// ─── Metastore ─────────────────────────────────────────────────────────
const metastore: ServiceDef = {
  name: 'metastore',
  cliName: 'metastore',
  description: 'Metastore API — metadata repository and schemas',
  factoryFn: 'createMetastoreClient',
  sourceDir: 'metastore',
  clientFile: 'metastoreClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'healthCheck',
      cliName: 'health',
      description: 'Check metastore health',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
  ],
  subGroups: [
    {
      name: 'repository',
      cliName: 'objects',
      description: 'Metadata object repository',
      sourceFile: 'repository/repository.ts',
      methods: [
        {
          name: 'getMetaObjects',
          cliName: 'list',
          description: 'List metadata objects',
          httpMethod: 'GET',
          args: [{ name: 'objectType', description: 'Object type', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'getMetaObject',
          cliName: 'get',
          description: 'Get a metadata object',
          httpMethod: 'GET',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
          ],
          options: [],
        },
        {
          name: 'createMetaObject',
          cliName: 'create',
          description: 'Create a metadata object',
          httpMethod: 'POST',
          args: [{ name: 'objectType', description: 'Object type', required: true, type: 'string' }],
          options: [{ name: 'data', description: 'Object data as JSON', type: 'json', required: true }],
        },
        {
          name: 'updateMetaObject',
          cliName: 'update',
          description: 'Update a metadata object (partial)',
          httpMethod: 'PATCH',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
          ],
          options: [{ name: 'data', description: 'Update data as JSON', type: 'json', required: true }],
        },
        {
          name: 'replaceMetaObject',
          cliName: 'replace',
          description: 'Replace a metadata object (full)',
          httpMethod: 'PUT',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
          ],
          options: [{ name: 'data', description: 'Replacement data as JSON', type: 'json', required: true }],
        },
        {
          name: 'deleteMetaObject',
          cliName: 'delete',
          description: 'Delete a metadata object',
          httpMethod: 'DELETE',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
          ],
          options: [],
        },
        {
          name: 'getMetaObjectRevisions',
          cliName: 'revisions',
          description: 'List object revisions',
          httpMethod: 'GET',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
          ],
          options: [],
        },
        {
          name: 'getMetaObjectRevision',
          cliName: 'get-revision',
          description: 'Get a specific revision',
          httpMethod: 'GET',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
            { name: 'revision', description: 'Revision number', required: true, type: 'string' },
          ],
          options: [],
        },
        {
          name: 'deleteMetaObjectRevision',
          cliName: 'delete-revision',
          description: 'Delete a specific revision',
          httpMethod: 'DELETE',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'uuid', description: 'Object UUID', required: true, type: 'string' },
            { name: 'revision', description: 'Revision number', required: true, type: 'string' },
          ],
          options: [],
        },
      ],
    },
    {
      name: 'schema',
      cliName: 'schema',
      description: 'Metastore schema operations',
      sourceFile: 'schema/schema.ts',
      methods: [
        {
          name: 'getSchema',
          cliName: 'get',
          description: 'Get schema for object type',
          httpMethod: 'GET',
          args: [{ name: 'objectType', description: 'Object type', required: true, type: 'string' }],
          options: [],
        },
        {
          name: 'getVersionedSchema',
          cliName: 'get-versioned',
          description: 'Get versioned schema',
          httpMethod: 'GET',
          args: [
            { name: 'objectType', description: 'Object type', required: true, type: 'string' },
            { name: 'version', description: 'Schema version', required: true, type: 'string' },
          ],
          options: [],
        },
      ],
    },
  ],
};

// ─── Sync Actions ──────────────────────────────────────────────────────
const syncActions: ServiceDef = {
  name: 'sync-actions',
  cliName: 'sync-actions',
  description: 'Sync Actions API — git repository operations',
  factoryFn: 'createSyncActionsClient',
  sourceDir: 'syncActions',
  clientFile: 'syncActionsClient.ts',
  requiresAuth: true,
  methods: [
    {
      name: 'enrollMFA',
      cliName: 'enroll-mfa',
      description: 'Enroll MFA for a user',
      httpMethod: 'POST',
      args: [],
      options: [{ name: 'data', description: 'MFA enrollment data as JSON', type: 'json', required: true }],
    },
  ],
  subGroups: [
    {
      name: 'gitRepository',
      cliName: 'git-repo',
      description: 'Git repository operations',
      sourceFile: 'gitRepository/gitRepository.ts',
      methods: [
        {
          name: 'getDataAppPublicGitRepository',
          cliName: 'data-app-public',
          description: 'Get data app public git repository info',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Repository URL and options as JSON', type: 'json', required: true }],
        },
        {
          name: 'getDataAppPasswordPrivateGitRepository',
          cliName: 'data-app-private-password',
          description: 'Get data app private git repository (password auth)',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Repository URL, username, password as JSON', type: 'json', required: true }],
        },
        {
          name: 'getDataAppSSHKeyPrivateGitRepository',
          cliName: 'data-app-private-ssh',
          description: 'Get data app private git repository (SSH key auth)',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Repository URL, username, SSH key as JSON', type: 'json', required: true }],
        },
        {
          name: 'getPublicGitRepository',
          cliName: 'public',
          description: 'Get public git repository info',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Repository URL and options as JSON', type: 'json', required: true }],
        },
        {
          name: 'getPrivateGitRepository',
          cliName: 'private',
          description: 'Get private git repository info (password auth)',
          httpMethod: 'POST',
          args: [],
          options: [{ name: 'data', description: 'Repository URL, username, password as JSON', type: 'json', required: true }],
        },
      ],
    },
  ],
};

// ─── Status ────────────────────────────────────────────────────────────
const status: ServiceDef = {
  name: 'status',
  cliName: 'status',
  description: 'Status API — platform health summary',
  factoryFn: 'createStatusClient',
  sourceDir: 'status',
  clientFile: 'statusClient.ts',
  requiresAuth: false,
  methods: [
    {
      name: 'getSummary',
      cliName: 'summary',
      description: 'Get platform status summary',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── Assets ────────────────────────────────────────────────────────────
const assets: ServiceDef = {
  name: 'assets',
  cliName: 'assets',
  description: 'Assets API — changelog and public resources',
  factoryFn: 'createAssetsClient',
  sourceDir: 'assets',
  clientFile: 'assetsClient.ts',
  requiresAuth: false,
  methods: [
    {
      name: 'getPublishedChangelogPosts',
      cliName: 'changelog',
      description: 'Get published changelog posts',
      httpMethod: 'GET',
      args: [],
      options: [],
    },
  ],
  subGroups: [],
};

// ─── Complete Registry ─────────────────────────────────────────────────
export const API_REGISTRY: ServiceDef[] = [
  dataScience,
  storage,
  vault,
  management,
  queue,
  sandboxes,
  editor,
  encryption,
  chat,
  ai,
  queryService,
  metastore,
  syncActions,
  status,
  assets,
];

/** Count total methods across all services */
export function countMethods(): { total: number; byService: Record<string, number> } {
  const byService: Record<string, number> = {};
  let total = 0;

  for (const service of API_REGISTRY) {
    let count = service.methods.length;
    for (const group of service.subGroups) {
      count += group.methods.length;
    }
    byService[service.name] = count;
    total += count;
  }

  return { total, byService };
}
