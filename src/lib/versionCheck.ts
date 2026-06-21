import { Device } from '@capacitor/device';
import pkg from '../../package.json';

const GITHUB_API = 'https://api.github.com/repos/tgecm/teleshop-admin/releases/latest';
const CHECK_KEY = 'last_version_check';
const ONE_DAY = 86400000;

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] || 0;
    const b = c[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

async function getAppVersion(): Promise<string> {
  try {
    const info = await Device.getInfo();
    if (info.appVersion) return info.appVersion;
  } catch {}
  return pkg.version;
}

let cachedResult: { hasUpdate: boolean; latestVersion: string; currentVersion: string } | null = null;

function buildResult(latestVersion: string, currentVersion: string) {
  return {
    hasUpdate: isNewer(latestVersion, currentVersion),
    latestVersion,
    currentVersion,
  };
}

export async function checkForUpdate(bypassCache = false): Promise<{ hasUpdate: boolean; latestVersion: string; currentVersion: string }> {
  const currentVersion = await getAppVersion();

  if (!bypassCache) {
    if (cachedResult && cachedResult.currentVersion === currentVersion) return cachedResult;

    const lastCheck = localStorage.getItem(CHECK_KEY);
    const now = Date.now();
    if (lastCheck && now - Number(lastCheck) < ONE_DAY) {
      const stored = localStorage.getItem('cached_version_result');
      if (stored) {
        try {
          cachedResult = JSON.parse(stored);
          if (cachedResult.currentVersion === currentVersion) return cachedResult;
        } catch {}
      }
    }
  }

  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    const latestVersion = data.tag_name || '';

    cachedResult = buildResult(latestVersion, currentVersion);

    localStorage.setItem(CHECK_KEY, String(Date.now()));
    localStorage.setItem('cached_version_result', JSON.stringify(cachedResult));

    return cachedResult;
  } catch {
    return buildResult('', currentVersion);
  }
}

export function clearVersionCache() {
  cachedResult = null;
  localStorage.removeItem(CHECK_KEY);
  localStorage.removeItem('cached_version_result');
}
