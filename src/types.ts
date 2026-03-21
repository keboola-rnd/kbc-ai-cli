// Re-export types we need from the api-client, with local fallbacks
// These types match the api-client's Storage API types for Data App configurations

export type DataAppSecrets = Record<string, string>;

export type DataAppGitConfig = {
  repository?: string;
  branch?: string;
  entrypoint?: string;
  username?: string;
  '#password'?: string;
};

export type DataAppConfig = {
  slug?: string;
  type?: string;
  secrets?: DataAppSecrets;
  streamlit?: {
    'config.toml'?: string;
  };
  streamlitAuthEnabled?: boolean;
  freezeDependencies?: boolean;
  git?: DataAppGitConfig;
};

export type DataAppParameters = {
  id?: string;
  size?: string;
  autoSuspendAfterSeconds?: number;
  imageVersion?: string;
  script?: string[];
  packages?: string[];
  dataApp?: DataAppConfig;
};

export type DataAppAuthorization = {
  app_proxy?: {
    auth_providers?: Array<{
      id: string;
      type: string;
    }>;
    auth_rules?: Array<{
      type: string;
      value: string;
      auth_required: boolean;
      auth: string[];
    }>;
  };
};

export type DataAppStorageInput = {
  tables?: unknown[];
  files?: unknown[];
};

export type DataAppConfiguration = {
  parameters?: DataAppParameters;
  authorization?: DataAppAuthorization;
  storage?: {
    input?: DataAppStorageInput;
  };
};

export type ComponentConfig = {
  id: string;
  name: string;
  description: string;
  created: string;
  version: number;
  isDisabled: boolean;
  isDeleted: boolean;
  configuration: DataAppConfiguration;
  state: Record<string, unknown>;
  changeDescription: string;
  currentVersion: {
    created: string;
    creatorToken: { id: number; description: string };
    changeDescription: string;
  };
};

export type ExistingApp = {
  id: string;
  configId: string;
  projectId: string;
  name: string;
  version: string;
  state: string;
  desiredState: string;
  url: string;
  configVersion: string;
  createdAt: string;
  updatedAt: string;
  appType?: string;
};

export type AppRun = {
  id: string;
  appId: string;
  state: string;
  configVersion: string;
  startedAt: string;
  finishedAt?: string;
  startupLogs?: string;
};

export type StackInfo = {
  api: string;
  services: Array<{ id: string; url: string }>;
  components: unknown[];
  features: string[];
  host: string;
  stack: string;
  version: string;
};

export type StorageToken = {
  id: string;
  description: string;
  isMasterToken: boolean;
  canManageBuckets: boolean;
  owner: {
    id: number;
    name: string;
    defaultBackend: string;
    features: string[];
  };
  admin: {
    id: number;
    name: string;
    role: string;
  };
};
