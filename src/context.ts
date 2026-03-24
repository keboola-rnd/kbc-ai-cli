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
//
// Generated commands call:  api._call('methodName', 'POST', arg1, arg2, ...)
// Sub-group commands call:  (await ctx.managementApi()).projects._call('getProject', 'GET', id)
//
// The _call() pattern passes the HTTP method explicitly, avoiding misclassification.

function createServiceProxy(
  baseUrl: string,
  token: string,
  subGroupNames?: string[],
): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      // Prevent the proxy from being treated as a thenable when awaited.
      // Without this, `await ctx.dataScienceApi()` would hang forever because
      // JS checks `proxy.then` and our catch-all handler returns a function.
      if (prop === 'then') return undefined;
      // _call(methodName, httpMethod, urlTemplate, idCount, ...args)
      // Generated commands pass URL template + idCount explicitly.
      if (prop === '_call') {
        return (methodName: string, httpMethod: string, urlTemplate: string, idCount: number, ...args: unknown[]) => {
          return genericApiCall(baseUrl, token, methodName, httpMethod, urlTemplate, idCount, args);
        };
      }
      // _callText(methodName, httpMethod, urlTemplate, textBody, queryParams?)
      // For endpoints that expect text/plain body with query params (e.g. encryption encrypt).
      if (prop === '_callText') {
        return (methodName: string, httpMethod: string, urlTemplate: string, textBody: string, queryParams?: Record<string, unknown>) => {
          return textApiCall(baseUrl, token, httpMethod, urlTemplate, textBody, queryParams);
        };
      }
      // Sub-group access: return a nested proxy with its own _call
      if (subGroupNames && subGroupNames.includes(prop)) {
        return createServiceProxy(baseUrl, token);
      }
      // Legacy fallback: direct method call (used by hand-written commands)
      return (...args: unknown[]) => {
        const httpMethod = inferHttpMethod(prop);
        // Legacy calls don't have urlTemplate — use empty string and 0 idCount for fallback
        return genericApiCall(baseUrl, token, prop, httpMethod, '', 0, args);
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

function isWriteMethod(httpMethod: string): boolean {
  return httpMethod === 'POST' || httpMethod === 'PATCH' || httpMethod === 'PUT';
}

async function genericApiCall(
  baseUrl: string,
  token: string,
  methodName: string,
  httpMethod: string,
  urlTemplate: string,
  idCount: number,
  args: unknown[],
): Promise<unknown> {
  const headers: Record<string, string> = { [STORAGE_API_TOKEN_HEADER]: token };
  const pathAndBody = buildPathFromMethod(methodName, httpMethod, urlTemplate, idCount, args);

  const fullUrl = pathAndBody.query
    ? baseUrl + pathAndBody.path + '?' + pathAndBody.query
    : baseUrl + pathAndBody.path;

  return apiFetch<unknown>(fullUrl, {
    method: httpMethod,
    headers,
    body: pathAndBody.body,
  });
}

/**
 * For endpoints that expect text/plain body with query params (e.g. encryption encrypt).
 * The text value is sent as-is in the body, and remaining options become URL query params.
 */
async function textApiCall(
  baseUrl: string,
  token: string,
  httpMethod: string,
  urlTemplate: string,
  textBody: string,
  queryParams?: Record<string, unknown>,
): Promise<unknown> {
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  const fullUrl = qs
    ? baseUrl + urlTemplate + '?' + qs
    : baseUrl + urlTemplate;

  const response = await fetch(fullUrl, {
    method: httpMethod,
    headers: {
      'Content-Type': 'text/plain',
      [STORAGE_API_TOKEN_HEADER]: token,
    },
    body: textBody,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error (${response.status}): ${errorBody}`);
  }

  // Try to parse as JSON, fall back to text
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Build REST path from the urlTemplate and idCount passed by generated commands.
 * Templates use {0}, {1}, ... for positional ID args and {branchId} etc. for named placeholders.
 * No hand-maintained lookup table — every generated command carries its own template.
 */
function buildPathFromMethod(
  methodName: string,
  httpMethod: string,
  urlTemplate: string,
  idCount: number,
  args: unknown[],
): { path: string; body?: string; query?: string } {
  // If no template provided (legacy fallback), convert method name to path
  if (!urlTemplate && urlTemplate !== '') {
    const p = '/' + methodName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/^(get|create|update|patch|delete|reset|list|search)-/, '');
    return { path: p, body: args[0] ? JSON.stringify(args[0]) : undefined };
  }

  let template = urlTemplate;

  // Replace positional placeholders {0}, {1}, ... with actual arg values
  for (let i = 0; i < idCount && i < args.length; i++) {
    template = template.replace('{' + String(i) + '}', String(args[i]));
  }

  // Remaining args after IDs are consumed — could be options/body object
  const lastArg = args.length > idCount ? args[idCount] : undefined;
  const opts = (typeof lastArg === 'object' && lastArg !== null)
    ? lastArg as Record<string, unknown>
    : {};

  // Replace named placeholders like {branchId}, {workspaceId} from options.
  // Track consumed keys so we can strip them from body/query later.
  const consumedKeys = new Set<string>();
  if (template.includes('{branchId}')) {
    const branchId = (opts['branchId'] as string) ?? 'default';
    template = template.replace('{branchId}', branchId);
    consumedKeys.add('branchId');
  }
  if (template.includes('{workspaceId}')) {
    const workspaceId = (opts['workspaceId'] as string) ?? '';
    template = template.replace('{workspaceId}', workspaceId);
    consumedKeys.add('workspaceId');
  }
  // Also handle {feature} placeholder used by management methods
  if (template.includes('{feature}')) {
    const feature = (opts['feature'] as string) ?? '';
    template = template.replace('{feature}', feature);
    consumedKeys.add('feature');
  }
  // Also handle {userId} placeholder
  if (template.includes('{userId}')) {
    const userId = (opts['userId'] as string) ?? '';
    template = template.replace('{userId}', userId);
    consumedKeys.add('userId');
  }

  // Build a clean opts object without consumed placeholder keys
  const cleanOpts: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(opts)) {
    if (!consumedKeys.has(key) && value !== undefined && value !== null) {
      cleanOpts[key] = value;
    }
  }

  let bodyStr: string | undefined;
  let queryString: string | undefined;
  const hasCleanOpts = Object.keys(cleanOpts).length > 0;

  if (isWriteMethod(httpMethod) || httpMethod === 'DELETE') {
    // POST/PATCH/PUT/DELETE — serialize as JSON body
    if (hasCleanOpts) {
      bodyStr = JSON.stringify(cleanOpts);
    }
  } else {
    // GET and other read methods — serialize as query string
    if (hasCleanOpts) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(cleanOpts)) {
        params.set(key, String(value));
      }
      const qs = params.toString();
      if (qs) queryString = qs;
    }
  }

  return { path: template, body: bodyStr, query: queryString };
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
    return createServiceProxy(baseUrl, this.token, [
      'tables', 'buckets', 'componentsAndConfigurations', 'branches',
      'files', 'jobs', 'tokens', 'workspaces', 'mergeRequests',
    ]);
  }

  async vaultApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('vault');
    return createServiceProxy(url, this.token);
  }

  async managementApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('manage');
    return createServiceProxy(url, this.token, ['projects', 'features', 'users']);
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
    return createServiceProxy(url, this.token, ['repository', 'schema']);
  }

  async syncActionsApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('sync-actions');
    return createServiceProxy(url, this.token, ['gitRepository']);
  }

  async statusApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('status');
    return createServiceProxy(url, this.token);
  }

  async assetsApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('assets');
    return createServiceProxy(url, this.token);
  }

  async telemetryApi(): Promise<Record<string, unknown>> {
    const url = await this.getServiceUrl('telemetry');
    return createServiceProxy(url, this.token, ['provisioning']);
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
