import { getActiveProfile, getCurrentAppId, loadConfig } from './config';
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
      errorMessage = text || `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`API Error (${response.status}): ${errorMessage}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

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

    printError('Not authenticated. Run: kbc-app auth --stack <URL> --token <TOKEN>');
    process.exit(1);
  }

  resolveAppId(explicitId?: string): string {
    const appId = explicitId ?? process.env.KBC_APP_ID ?? getCurrentAppId();
    if (!appId) {
      printError('No app ID specified. Use: kbc-app use <app-id> or pass app ID as argument.');
      process.exit(1);
    }
    return appId;
  }

  private storageHeaders(): Record<string, string> {
    return { [STORAGE_API_TOKEN_HEADER]: this.token };
  }

  // --- Stack Info & Service Discovery ---

  async getStackInfo(): Promise<StackInfo> {
    if (this._stackInfo) return this._stackInfo;
    this._stackInfo = await apiFetch<StackInfo>(
      `${this.stackUrl}/v2/storage?exclude=componentDetails`,
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
      throw new Error(`Service '${serviceId}' is not available in this stack.`);
    }
    return url;
  }

  // --- Token Verify ---

  async verifyToken(): Promise<StorageToken> {
    if (this._tokenInfo) return this._tokenInfo;
    this._tokenInfo = await apiFetch<StorageToken>(
      `${this.stackUrl}/v2/storage/tokens/verify`,
      { headers: this.storageHeaders() },
    );
    return this._tokenInfo;
  }

  // --- Data Science API (Apps) ---

  async listApps(projectId?: string): Promise<ExistingApp[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    const query = projectId ? `?project=${projectId}` : '';
    return apiFetch<ExistingApp[]>(`${dsUrl}/apps${query}`, {
      headers: this.storageHeaders(),
    });
  }

  async getApp(appId: string): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(`${dsUrl}/apps/${appId}`, {
      headers: this.storageHeaders(),
    });
  }

  async patchApp(appId: string, body: Record<string, unknown>): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(`${dsUrl}/apps/${appId}`, {
      method: 'PATCH',
      headers: this.storageHeaders(),
      body: JSON.stringify(body),
    });
  }

  async deleteApp(appId: string): Promise<void> {
    const dsUrl = await this.getServiceUrl('data-science');
    await apiFetch<void>(`${dsUrl}/apps/${appId}`, {
      method: 'DELETE',
      headers: this.storageHeaders(),
    });
  }

  async createApp(body: Record<string, unknown>): Promise<ExistingApp> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<ExistingApp>(`${dsUrl}/apps`, {
      method: 'POST',
      headers: this.storageHeaders(),
      body: JSON.stringify(body),
    });
  }

  // --- Logs ---

  async getAppLogsTail(
    appId: string,
    query?: { since?: string; lines?: number },
  ): Promise<{ logs: string | null; nextLogTimestamp: string | null }> {
    const dsUrl = await this.getServiceUrl('data-science');
    const params = new URLSearchParams();
    if (query?.since) params.set('since', query.since);
    if (query?.lines) params.set('lines', String(query.lines));
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await fetch(`${dsUrl}/apps/${appId}/logs/tail${qs}`, {
        headers: {
          [STORAGE_API_TOKEN_HEADER]: this.token,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 400) {
        // App not running
        return { logs: null, nextLogTimestamp: null };
      }

      if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${await response.text()}`);
      }

      const logs = await response.text();
      const logsOrNull = logs === '' ? null : logs;

      // Parse last timestamp from logs for incremental polling
      let nextLogTimestamp: string | null = null;
      if (logsOrNull) {
        const lines = logsOrNull.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          const match = lastLine.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/);
          if (match) {
            // Add 1ms to avoid duplicate
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
    const response = await fetch(`${dsUrl}/apps/${appId}/logs/download`, {
      headers: { [STORAGE_API_TOKEN_HEADER]: this.token },
    });
    if (!response.ok) {
      throw new Error(`API Error (${response.status}): ${await response.text()}`);
    }
    return response.text();
  }

  // --- Runs ---

  async getAppRuns(appId: string): Promise<unknown[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown[]>(`${dsUrl}/apps/${appId}/runs`, {
      headers: this.storageHeaders(),
    });
  }

  async getAppRun(appId: string, runId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(`${dsUrl}/apps/${appId}/runs/${runId}`, {
      headers: this.storageHeaders(),
    });
  }

  // --- Password ---

  async getAppPassword(appId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(`${dsUrl}/apps/${appId}/password`, {
      headers: this.storageHeaders(),
    });
  }

  async resetAppPassword(appId: string): Promise<unknown> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown>(`${dsUrl}/apps/${appId}/reset-password`, {
      method: 'POST',
      headers: this.storageHeaders(),
    });
  }

  // --- Runtimes ---

  async getRuntimes(): Promise<unknown[]> {
    const dsUrl = await this.getServiceUrl('data-science');
    return apiFetch<unknown[]>(`${dsUrl}/runtimes`, {
      headers: this.storageHeaders(),
    });
  }

  // --- Storage API (Configurations) ---

  async getConfiguration(configId: string): Promise<ComponentConfig> {
    return apiFetch<ComponentConfig>(
      `${this.stackUrl}/v2/storage/branch/default/components/${KEBOOLA_DATA_APPS_COMPONENT_ID}/configs/${configId}`,
      { headers: this.storageHeaders() },
    );
  }

  async getConfigurations(): Promise<ComponentConfig[]> {
    return apiFetch<ComponentConfig[]>(
      `${this.stackUrl}/v2/storage/branch/default/components/${KEBOOLA_DATA_APPS_COMPONENT_ID}/configs`,
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
      `${this.stackUrl}/v2/storage/branch/default/components/${KEBOOLA_DATA_APPS_COMPONENT_ID}/configs/${configId}`,
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
      throw new Error(`API Error (${response.status}): ${text}`);
    }

    return (await response.json()) as ComponentConfig;
  }

  // --- Encryption ---

  async encrypt(
    data: string,
    opts?: { projectId?: string; componentId?: string },
  ): Promise<string> {
    const encUrl = await this.getServiceUrl('encryption');
    const params = new URLSearchParams();
    if (opts?.projectId) params.set('projectId', opts.projectId);
    if (opts?.componentId) params.set('componentId', opts.componentId);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${encUrl}/encrypt${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Encryption Error (${response.status}): ${await response.text()}`);
    }

    return response.text();
  }

  // --- Raw API ---

  async rawApi(
    serviceId: string,
    method: string,
    path: string,
    data?: string,
  ): Promise<unknown> {
    let baseUrl: string;
    if (serviceId === 'storage') {
      baseUrl = `${this.stackUrl}/v2/storage`;
    } else {
      baseUrl = await this.getServiceUrl(serviceId);
    }

    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    return apiFetch<unknown>(url, {
      method: method.toUpperCase(),
      headers: this.storageHeaders(),
      body: data,
    });
  }
}
