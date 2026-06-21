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

export async function checkForUpdate(): Promise<{ hasUpdate: boolean; latestVersion: string; currentVersion: string }> {
  if (cachedResult) return cachedResult;

  const currentVersion = await getAppVersion();
  const lastCheck = localStorage.getItem(CHECK_KEY);
  const now = Date.now();

  if (lastCheck && now - Number(lastCheck) < ONE_DAY) {
    const stored = localStorage.getItem('cached_version_result');
    if (stored) {
      try {
        cachedResult = JSON.parse(stored);
        return cachedResult!;
      } catch {}
    }
  }

  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    const latestVersion = data.tag_name || '';

    cachedResult = {
      hasUpdate: isNewer(latestVersion, currentVersion),
      latestVersion,
      currentVersion,
    };

    localStorage.setItem(CHECK_KEY, String(now));
    localStorage.setItem('cached_version_result', JSON.stringify(cachedResult));

    return cachedResult;
  } catch {
    cachedResult = { hasUpdate: false, latestVersion: '', currentVersion };
    return cachedResult;
  }
}
