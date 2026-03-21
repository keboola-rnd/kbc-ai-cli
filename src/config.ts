import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR, CONFIG_FILE } from './constants';

export type Profile = {
  stackUrl: string;
  token: string;
};

export type LocalConfig = {
  currentProfile: string;
  currentAppId?: string;
  profiles: Record<string, Profile>;
};

function getConfigPath(): string {
  return join(homedir(), CONFIG_DIR, CONFIG_FILE);
}

function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR);
}

export function loadConfig(): LocalConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { currentProfile: 'default', profiles: {} };
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as LocalConfig;
  } catch {
    return { currentProfile: 'default', profiles: {} };
  }
}

export function saveConfig(config: LocalConfig): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

export function getActiveProfile(): Profile | null {
  const config = loadConfig();
  return config.profiles[config.currentProfile] ?? null;
}

export function getCurrentAppId(): string | undefined {
  const config = loadConfig();
  return config.currentAppId;
}

export function setCurrentAppId(appId: string): void {
  const config = loadConfig();
  config.currentAppId = appId;
  saveConfig(config);
}

export function setProfile(name: string, profile: Profile): void {
  const config = loadConfig();
  config.profiles[name] = profile;
  config.currentProfile = name;
  saveConfig(config);
}
