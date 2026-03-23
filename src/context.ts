import { getActiveProfile, getCurrentAppId } from './config';
import { KEBOOLA_DATA_APPS_COMPONENT_ID } from './constants';
import { printError } from './output';
import type {
  ComponentConfig,
  ExistingApp,
  StackInfo,
  StorageToken,
} from './types';

const STORAGE_API_TOKEN_HEADER = 'X-StorageApi-Token';

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body,
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.message ?? errorJson.error ?? text;
    } catch {
      errorMessage = text || 'HTTP ' + String(response.status) + ' ' + response.statusText;
    }
    throw new Error('API Error (' + String(response.status) + '): ' + errorMessage);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

// ── Service Proxy Infrastructure ────────────────────────────────────
// Used by generated atomic commands to make HTTP calls via method name mapping.

function createServiceProxy(
  baseUrl: string,
  token: string,
): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      return (...args: unknown[]) => {
        return genericApiCall(baseUrl, token, '', prop, args);
      };
    },
  });
}

function inferHttpMethod(methodName: string): string {
  if (
    methodName.startsWith('create') || methodName.startsWith('reset') ||
    methodName.startsWith('run') || methodName.startsWith('post') ||
    methodName.startsWith('stream') || methodName.startsWith('add') ||
    methodName.startsWith('load') || methodName.startsWith('clone') ||
    methodName.startsWith('refresh') || methodName.startsWith('execute') ||
    methodName.startsWith('analyze') || methodName.startsWith('suggest') ||
    methodName.startsWith('generate') || methodName.startsWith('save') ||
    methodName.startsWith('terminate') || methodName.startsWith('encrypt')
  ) {
    return 'POST';
  }
  if (methodName.startsWith('patch')) return 'PATCH';
  if (methodName.startsWith('update')) return 'PUT';
  if (
    methodName.startsWith('delete') || methodName.startsWith('revoke') ||
    methodName.startsWith('remove') || methodName.startsWith('cancel')
  ) {
    return 'DELETE';
  }
  return 'GET';
}

function isWriteMethod(methodName: string): boolean {
  const m = inferHttpMethod(methodName);
  return m === 'POST' || m === 'PATCH' || m === 'PUT';
}

async function genericApiCall(
  baseUrl: string,
  token: string,
  pathPrefix: string,
  methodName: string,
  args: unknown[],
): Promise<unknown> {
  const headers: Record<string, string> = { [STORAGE_API_TOKEN_HEADER]: token };
  const httpMethod = inferHttpMethod(methodName);
  const pathAndBody = buildPathFromMethod(methodName, args, pathPrefix);

  const fullUrl = pathAndBody.query
    ? baseUrl + pathAndBody.path + '?' + pathAndBody.query
    : baseUrl + pathAndBody.path;

  return apiFetch<unknown>(fullUrl, {
    method: httpMethod,
    headers,
    body: pathAndBody.body,
  });
}

/** Method-to-REST-path mapping table */
const METHOD_MAPPINGS: Record<string, { template: string; idCount: number }> = {
  // Data Science
  getApps: { template: '/apps', idCount: 0 },
  getApp: { template: '/apps/{0}', idCount: 1 },
  createApp: { template: '/apps', idCount: 0 },
  patchApp: { template: '/apps/{0}', idCount: 1 },
  deleteApp: { template: '/apps/{0}', idCount: 1 },
  getAppPassword: { template: '/apps/{0}/password', idCount: 1 },
  resetAppPassword: { template: '/apps/{0}/reset-password', idCount: 1 },
  getAppRuns: { template: '/apps/{0}/runs', idCount: 1 },
  getAppRun: { template: '/apps/{0}/runs/{1}', idCount: 2 },
  getAppLogsTail: { template: '/apps/{0}/logs/tail', idCount: 1 },
  getAppLogsDownload: { template: '/apps/{0}/logs/download', idCount: 1 },
  getRuntimes: { template: '/runtimes', idCount: 0 },
  // Storage direct
  getStackInfo: { template: '', idCount: 0 },
  // Storage tables
  getTables: { template: '/branch/default/tables', idCount: 0 },
  getTable: { template: '/branch/default/tables/{0}', idCount: 1 },
  getDataPreview: { template: '/branch/default/tables/{0}/data-preview', idCount: 1 },
  deleteTableRows: { template: '/branch/default/tables/{0}/rows', idCount: 1 },
  // Storage buckets
  getBuckets: { template: '/branch/default/buckets', idCount: 0 },
  getBucket: { template: '/branch/default/buckets/{0}', idCount: 1 },
  createBucket: { template: '/branch/default/buckets', idCount: 0 },
  updateBucket: { template: '/branch/default/buckets/{0}', idCount: 1 },
  deleteBucket: { template: '/branch/default/buckets/{0}', idCount: 1 },
  createScheduledRefresh: { template: '/branch/default/buckets/scheduled-refresh', idCount: 0 },
  deleteScheduledTask: { template: '/branch/default/buckets/scheduled-tasks/{0}', idCount: 1 },
  // Storage configs
  getComponents: { template: '/branch/{branchId}/components', idCount: 0 },
  getComponent: { template: '/branch/{branchId}/components/{0}', idCount: 1 },
  getConfigurations: { template: '/branch/{branchId}/components/{0}/configs', idCount: 1 },
  getConfiguration: { template: '/branch/{branchId}/components/{0}/configs/{1}', idCount: 2 },
  createConfiguration: { template: '/branch/{branchId}/components/{0}/configs', idCount: 1 },
  deleteConfiguration: { template: '/branch/{branchId}/components/{0}/configs/{1}', idCount: 2 },
  searchComponentConfigurations: { template: '/branch/{branchId}/search/component-configurations', idCount: 0 },
  getConfigurationWorkspaces: { template: '/branch/{branchId}/components/{0}/configs/{1}/workspaces', idCount: 2 },
  createConfigurationWorkspace: { template: '/branch/{branchId}/components/{0}/configs/{1}/workspaces', idCount: 2 },
  createConfigurationRow: { template: '/branch/{branchId}/components/{0}/configs/{1}/rows', idCount: 2 },
  deleteConfigurationRow: { template: '/branch/{branchId}/components/{0}/configs/{1}/rows/{2}', idCount: 3 },
  // Storage branches
  getBranches: { template: '/branch', idCount: 0 },
  getBranch: { template: '/branch/{0}', idCount: 1 },
  createBranch: { template: '/branch', idCount: 0 },
  deleteBranch: { template: '/branch/{0}', idCount: 1 },
  // Storage files
  getFiles: { template: '/branch/default/files', idCount: 0 },
  getFile: { template: '/files/{0}', idCount: 1 },
  deleteFile: { template: '/files/{0}', idCount: 1 },
  // Storage jobs
  getJobs: { template: '/jobs', idCount: 0 },
  getJob: { template: '/jobs/{0}', idCount: 1 },
  // Storage tokens
  getTokens: { template: '/tokens', idCount: 0 },
  getToken: { template: '/tokens/{0}', idCount: 1 },
  verifyToken: { template: '/tokens/verify', idCount: 0 },
  createToken: { template: '/tokens', idCount: 0 },
  refreshToken: { template: '/tokens/{0}', idCount: 1 },
  revokeToken: { template: '/tokens/{0}', idCount: 1 },
  // Storage workspaces
  getWorkspaces: { template: '/workspaces', idCount: 0 },
  getWorkspace: { template: '/workspaces/{0}', idCount: 1 },
  createWorkspace: { template: '/workspaces', idCount: 0 },
  deleteWorkspace: { template: '/workspaces/{0}', idCount: 1 },
  resetWorkspacePassword: { template: '/workspaces/{0}/password', idCount: 1 },
  loadDataIntoWorkspace: { template: '/workspaces/{0}/load', idCount: 1 },
  cloneIntoWorkspace: { template: '/workspaces/{0}/clone', idCount: 1 },
  // Storage merge requests
  getMergeRequests: { template: '/branch/default/merge-requests', idCount: 0 },
  getMergeRequest: { template: '/branch/default/merge-requests/{0}', idCount: 1 },
  // Vault
  listSecrets: { template: '/secrets', idCount: 0 },
  getSecret: { template: '/secrets/{0}', idCount: 1 },
  createSecret: { template: '/secrets', idCount: 0 },
  deleteSecret: { template: '/secrets/{0}', idCount: 1 },
  // Management
  getOrganizations: { template: '/organizations', idCount: 0 },
  getOrganization: { template: '/organizations/{0}', idCount: 1 },
  getProjects: { template: '/projects', idCount: 0 },
  getProject: { template: '/projects/{0}', idCount: 1 },
  createProject: { template: '/projects', idCount: 0 },
  deleteProject: { template: '/projects/{0}', idCount: 1 },
  getProjectUsers: { template: '/projects/{0}/users', idCount: 1 },
  addUserToProject: { template: '/projects/{0}/users', idCount: 1 },
  removeUserFromProject: { template: '/projects/{0}/users/{1}', idCount: 2 },
  getFeatures: { template: '/features', idCount: 0 },
  // Queue
  createJob: { template: '/jobs', idCount: 0 },
  getQueueJob: { template: '/jobs/{0}', idCount: 1 },
  listQueueJobs: { template: '/jobs', idCount: 0 },
  terminateJob: { template: '/jobs/{0}/kill', idCount: 1 },
  // Sandboxes
  getSandboxes: { template: '/sandboxes', idCount: 0 },
  getSandbox: { template: '/sandboxes/{0}', idCount: 1 },
  deleteSandbox: { template: '/sandboxes/{0}', idCount: 1 },
  // Editor
  getEditorFile: { template: '/files/{0}', idCount: 1 },
  getEditorFiles: { template: '/files', idCount: 0 },
  saveFile: { template: '/files/{0}', idCount: 1 },
  createEditorFile: { template: '/files', idCount: 0 },
  deleteEditorFile: { template: '/files/{0}', idCount: 1 },
  getEditorJobs: { template: '/jobs', idCount: 0 },
  getEditorJob: { template: '/jobs/{0}', idCount: 1 },
  createEditorJob: { template: '/jobs', idCount: 0 },
  getKernels: { template: '/kernels', idCount: 0 },
  getKernel: { template: '/kernels/{0}', idCount: 1 },
  // Encryption
  encrypt: { template: '/encrypt', idCount: 0 },
  // Chat
  postChatMessage: { template: '/chat', idCount: 0 },
  getChatHistory: { template: '/chat/history', idCount: 0 },
  createChatSession: { template: '/chat/sessions', idCount: 0 },
  getChatSessions: { template: '/chat/sessions', idCount: 0 },
  getChatSession: { template: '/chat/sessions/{0}', idCount: 1 },
  deleteChatSession: { template: '/chat/sessions/{0}', idCount: 1 },
  getChatModels: { template: '/chat/models', idCount: 0 },
  streamChatResponse: { template: '/chat/stream', idCount: 0 },
  // AI
  generateDescription: { template: '/descriptions', idCount: 0 },
  getAiModels: { template: '/models', idCount: 0 },
  analyzeCode: { template: '/analyze', idCount: 0 },
  suggestTransformation: { template: '/suggest', idCount: 0 },
  // Query Service
  executeQuery: { template: '/query', idCount: 0 },
  getQueryResult: { template: '/query/{0}', idCount: 1 },
  cancelQuery: { template: '/query/{0}/cancel', idCount: 1 },
  getQueryHistory: { template: '/query/history', idCount: 0 },
  // Metastore
  getMetastoreDatabases: { template: '/databases', idCount: 0 },
  getMetastoreDatabase: { template: '/databases/{0}', idCount: 1 },
  getMetastoreSchemas: { template: '/databases/{0}/schemas', idCount: 1 },
  getMetastoreSchema: { template: '/databases/{0}/schemas/{1}', idCount: 2 },
  getMetastoreTables: { template: '/databases/{0}/schemas/{1}/tables', idCount: 2 },
  getMetastoreTable: { template: '/databases/{0}/schemas/{1}/tables/{2}', idCount: 3 },
  getMetastoreColumns: { template: '/databases/{0}/schemas/{1}/tables/{2}/columns', idCount: 3 },
  refreshMetastore: { template: '/refresh', idCount: 0 },
  getMetastoreStats: { template: '/stats', idCount: 0 },
  // Sync Actions
  runSyncAction: { template: '/actions', idCount: 0 },
  getSyncActionResult: { template: '/actions/{0}', idCount: 1 },
  listSyncActions: { template: '/actions', idCount: 0 },
  getSyncActionConfigs: { template: '/actions/configs', idCount: 0 },
};

function buildPathFromMethod(
  methodName: string,
  args: unknown[],
  basePath: string,
): { path: string; body?: string; query?: string } {
  const mapping = METHOD_MAPPINGS[methodName];
  if (!mapping) {
    // Fallback: convert camelCase to /kebab-case path
    const p = '/' + methodName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/^(get|create|update|patch|delete|reset|list|search)-/, '');
    return { path: basePath + p, body: args[0] ? JSON.stringify(args[0]) : undefined };
  }

  let template = mapping.template;
  const idCount = mapping.idCount;

  for (let i = 0; i < idCount && i < args.length; i++) {
    template = template.replace('{' + String(i) + '}', String(args[i]));
  }

  const lastArg = args.length > idCount ? args[idCount] : undefined;
  const opts = (typeof lastArg === 'object' && lastArg !== null)
    ? lastArg as Record<string, unknown>
    : {};

  if (template.includes('{branchId}')) {
    const branchId = (opts['branchId'] as string) ?? 'default';
    template = template.replace('{branchId}', branchId);
  }

  let bodyStr: string | undefined;
  if (isWriteMethod(methodName)) {
    const bodyArg = args[idCount];
    if (bodyArg && typeof bodyArg === 'object') {
      bodyStr = JSON.stringify(bodyArg);
    }
  }

  let queryString: string | undefined;
  if (!isWriteMethod(methodName) && inferHttpMethod(methodName) !== 'DELETE') {
    const queryArg = args[idCount];
    if (queryArg && typeof queryArg === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryArg as Record<string, unknown>)) {
        if (value !== undefined && value !== null && key !== 'branchId') {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) queryString = qs;
    }
  }

  return { path: basePath + template, body: bodyStr, query: queryString };
}

// ── CliContext ───────────────────────────────────────────────────────

export class CliContext {
  public stackUrl: string;
  public token: string;
  private _stackInfo: StackInfo | null = null;
  private _tokenInfo: StorageToken | null = null;
  private _serviceUrls: Map<string, string> = new Map();

  constructor(stackUrl: string, token: string) {
    this.stackUrl = stackUrl.replace(/\/$/, '');
    this.token = token;
  }

  static fromEnvOrConfig(opts?: { stack?: string; token?: string }): CliContext {
    const stack = opts?.stack ?? process.env.KBC_APP_STACK_URL;
    const token = opts?.token ?? process.env.KBC_APP_TOKEN;

    if (stack && token) {
      return new CliContext(stack, token);
    }

    const profile = getActiveProfile();
    if (profile) {
      return new CliContext(
        opts?.stack ?? profile.stackUrl,
        opts?.token ?? profile.token,
      );
    }

    throw new Error('Not authenticated. Run: kbc auth login --stack <URL> --token <TOKEN>');
  }

  resolveAppId(explicitId?: string): string {
    const appId = explicitId ?? process.env.KBC_APP_ID ?? getCurrentAppId();
    if (!appId) {
      printError('No app ID specified. Use: kbc use <app-id> or pass app ID as argument.');
      process.exit(1);
    }
    return appId;
  }

  private storageHeaders(): Record<string, string> {
    return { [STORAGE_API_TOKEN_HEADER]: this.token };
  }

  // ── Stack Info & Service Discovery ────────────────────────────────

  async getStackInfo(): Promise<StackInfo> {
    if (this._stackInfo) return this._stackInfo;
    this._stackInfo = await apiFetch<StackInfo>(
      this.stackUrl + '/v2/storage?exclude=componentDetails',
      { headers: this.storageHeaders() },
    );
    for (const svc of this._stackInfo.services) {
      this._serviceUrls.set(svc.id, svc.url);
    }
    return this._stackInfo;
  }

  async getServiceUrl(serviceId: string): Promise<string> {
    await this.getStackInfo();
    const url = this._serviceUrls.get(serviceId);
    if (!url) {
      throw new Error("Service '" + serviceId + "' is not available in this stack.");
    }
    return url;
  }

  async verifyToken(): Promise<StorageToken> {
    if (this._tokenInfo) return this._tokenInfo;
    this._tokenInfo = await apiFetch<StorageToken>(
      this.stackUrl + '/v2/storage/tokens/verify',
      { headers: this.storageHeaders() },
    );
    return this._tokenInfo;
  }

  // ── Service-specific API proxies (used by generated commands) ─────

  async dataScienceApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('data-science');
    return createServiceProxy(url, this.token);
  }

  storageApi(): Record<string, unknown> {
    const baseUrl = this.stackUrl + '/v2/storage';
    const token = this.token;
    return new Proxy({} as Record<string, unknown>, {
      get(_target, prop: string) {
        const subGroups = [
          'tables', 'buckets', 'componentsAndConfigurations', 'branches',
          'files', 'jobs', 'tokens', 'workspaces', 'mergeRequests',
        ];
        if (subGroups.includes(prop)) {
          return createServiceProxy(baseUrl, token);
        }
        return (...args: unknown[]) => {
          return genericApiCall(baseUrl, token, '', prop, args);
        };
      },
    });
  }

  async vaultApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('vault');
    return createServiceProxy(url, this.token);
  }

  async managementApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('manage');
    return createServiceProxy(url, this.token);
  }

  async queueApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('queue');
    return createServiceProxy(url, this.token);
  }

  async sandboxesApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('sandboxes');
    return createServiceProxy(url, this.token);
  }

  async editorApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('editor');
    return createServiceProxy(url, this.token);
  }

  async encryptionApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('encryption');
    return createServiceProxy(url, this.token);
  }

  async chatApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('chat');
    return createServiceProxy(url, this.token);
  }

  async aiApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('ai');
    return createServiceProxy(url, this.token);
  }

  async queryServiceApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('query');
    return createServiceProxy(url, this.token);
  }

  async metastoreApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('metastore');
    return createServiceProxy(url, this.token);
  }

  async syncActionsApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('sync-actions');
    return createServiceProxy(url, this.token);
  }

  async statusApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('status');
    return createServiceProxy(url, this.token);
  }

  async assetsApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('assets');
    return createServiceProxy(url, this.token);
  }

  async genericServiceApi(serviceId: string): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl(serviceId);
    return createServiceProxy(url, this.token);
  }

  // ── Legacy hand-written API methods (used by existing commands) ───

  async listApps(projectId?: string): Promise<ExistingApp[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    const query = projectId ? '?project=' + projectId : '';
    return apiFetch<ExistingApp[]>(dsUrl + '/apps' + query, {
      headers: this.storageHeaders(),
    });
  }

  async getApp(appId: string): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(dsUrl + '/apps/' + appId, {
      headers: this.storageHeaders(),
    });
  }

  async patchApp(appId: string, body: Record<string, unknown>): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(dsUrl + '/apps/' + appId, {
      method: 'PATCH',
      headers: this.storageHeaders(),
      body: JSON.stringify(body),
    });
  }

  async deleteApp(appId: string): Promise<void> {
    const dsUrl = await this.getServiceUrl('data-science');
    await apiFetch<void>(dsUrl + '/apps/' + appId, {
      method: 'DELETE',
      headers: this.storageHeaders(),
    });
  }

  async createApp(body: Record<string, unknown>): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(dsUrl + '/apps', {
      method: 'POST',
      headers: this.storageHeaders(),
      body: JSON.stringify(body),
    });
  }

  async getAppLogsTail(
    appId: string,
    query?: { since?: string; lines?: number },
  ): Promise<{ logs: string | null; nextLogTimestamp: string | null }> {
    const dsUrl = await this.getServiceUrl('data-science');
    const params = new URLSearchParams();
    if (query?.since) params.set('since', query.since);
    if (query?.lines) params.set('lines', String(query.lines));
    const qs = params.toString() ? '?' + params.toString() : '';

    try {
      const response = await fetch(dsUrl + '/apps/' + appId + '/logs/tail' + qs, {
        headers: {
          [STORAGE_API_TOKEN_HEADER]: this.token,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 400) {
        return { logs: null, nextLogTimestamp: null };
      }

      if (!response.ok) {
        throw new Error('API Error (' + String(response.status) + '): ' + await response.text());
      }

      const logs = await response.text();
      const logsOrNull = logs === '' ? null : logs;

      let nextLogTimestamp: string | null = null;
      if (logsOrNull) {
        const lines = logsOrNull.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          const match = lastLine.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
          if (match) {
            const ts = new Date(match[1]!);
            ts.setMilliseconds(ts.getMilliseconds() + 1);
            nextLogTimestamp = ts.toISOString();
          }
        }
      }

      return { logs: logsOrNull, nextLogTimestamp };
    } catch (error) {
      if (error instanceof Error && error.message.includes('400')) {
        return { logs: null, nextLogTimestamp: null };
      }
      throw error;
    }
  }

  async getAppLogsDownload(appId: string): Promise<string> {
    const dsUrl = await this.getServiceUrl('data-science');
    const response = await fetch(dsUrl + '/apps/' + appId + '/logs/download', {
      headers: { [STORAGE_API_TOKEN_HEADER]: this.token },
    });
    if (!response.ok) {
      throw new Error('API Error (' + String(response.status) + '): ' + await response.text());
    }
    return response.text();
  }

  async getAppRuns(appId: string): Promise<unknown[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown[]>(dsUrl + '/apps/' + appId + '/runs', {
      headers: this.storageHeaders(),
    });
  }

  async getAppRun(appId: string, runId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(dsUrl + '/apps/' + appId + '/runs/' + runId, {
      headers: this.storageHeaders(),
    });
  }

  async getAppPassword(appId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(dsUrl + '/apps/' + appId + '/password', {
      headers: this.storageHeaders(),
    });
  }

  async resetAppPassword(appId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(dsUrl + '/apps/' + appId + '/reset-password', {
      method: 'POST',
      headers: this.storageHeaders(),
    });
  }

  async getRuntimes(): Promise<unknown[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown[]>(dsUrl + '/runtimes', {
      headers: this.storageHeaders(),
    });
  }

  async getConfigurationLegacy(configId: string): Promise<ComponentConfig> {
    return apiFetch<ComponentConfig>(
      this.stackUrl + '/v2/storage/branch/default/components/' + KEBOOLA_DATA_APPS_COMPONENT_ID + '/configs/' + configId,
      { headers: this.storageHeaders() },
    );
  }

  async getConfigurationsLegacy(): Promise<ComponentConfig[]> {
    return apiFetch<ComponentConfig[]>(
      this.stackUrl + '/v2/storage/branch/default/components/' + KEBOOLA_DATA_APPS_COMPONENT_ID + '/configs',
      { headers: this.storageHeaders() },
    );
  }

  async updateConfiguration(
    configId: string,
    body: {
      configuration?: string;
      name?: string;
      description?: string;
      changeDescription?: string;
    },
  ): Promise<ComponentConfig> {
    const formData = new URLSearchParams();
    if (body.configuration) formData.set('configuration', body.configuration);
    if (body.name) formData.set('name', body.name);
    if (body.description) formData.set('description', body.description);
    if (body.changeDescription) formData.set('changeDescription', body.changeDescription);

    const response = await fetch(
      this.stackUrl + '/v2/storage/branch/default/components/' + KEBOOLA_DATA_APPS_COMPONENT_ID + '/configs/' + configId,
      {
        method: 'PUT',
        headers: {
          [STORAGE_API_TOKEN_HEADER]: this.token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error('API Error (' + String(response.status) + '): ' + text);
    }

    return (await response.json()) as ComponentConfig;
  }

  async encryptLegacy(
    data: string,
    opts?: { projectId?: string; componentId?: string },
  ): Promise<string> {
    const encUrl = await this.getServiceUrl('encryption');
    const params = new URLSearchParams();
    if (opts?.projectId) params.set('projectId', opts.projectId);
    if (opts?.componentId) params.set('componentId', opts.componentId);
    const qs = params.toString() ? '?' + params.toString() : '';

    const response = await fetch(encUrl + '/encrypt' + qs, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: data,
    });

    if (!response.ok) {
      throw new Error('Encryption Error (' + String(response.status) + '): ' + await response.text());
    }

    return response.text();
  }

  async rawApi(
    serviceId: string,
    method: string,
    apiPath: string,
    data?: string,
  ): Promise<unknown> {
    let baseUrl: string;
    if (serviceId === 'storage') {
      baseUrl = this.stackUrl + '/v2/storage';
    } else {
      baseUrl = await this.getServiceUrl(serviceId);
    }
    const url = baseUrl + (apiPath.startsWith('/') ? apiPath : '/' + apiPath);
    return apiFetch<unknown>(url, {
      method: method.toUpperCase(),
      headers: this.storageHeaders(),
      body: data,
    });
  }

  // ── Output & Error Handling (used by generated commands) ──────────

  output(data: unknown): void {
    if (data === undefined || data === null) {
      console.log('OK');
      return;
    }
    if (typeof data === 'string') {
      console.log(data);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  }

  handleError(error: unknown): void {
    if (error instanceof Error) {
      printError(error.message);
    } else {
      printError(String(error));
    }
    process.exit(1);
  }
}
