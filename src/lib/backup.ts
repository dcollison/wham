import { Boulder, Attempt, Comment, Profile, Gym, GymArea, FeatureRequest } from '../types';

export interface WhamBackupData {
  version: 1;
  appName: 'Wham';
  exportedAt: string;
  gyms: Gym[];
  areas: GymArea[];
  boulders: Boulder[];
  attempts: Attempt[];
  comments: Comment[];
  profiles: Profile[];
  featureRequests?: FeatureRequest[];
  climberCustomizations?: Record<string, any>;
  sendsProps?: Record<string, string[]>;
}

export interface BackupSummary {
  exportedAt: string;
  boulderCount: number;
  attemptCount: number;
  commentCount: number;
  climberCount: number;
  gymCount: number;
  areaCount: number;
}

export interface LocalSnapshotMeta {
  id: string;
  timestamp: string;
  boulderCount: number;
  attemptCount: number;
  climberCount: number;
  reason?: string;
}

const SNAPSHOTS_KEY = 'wham_local_snapshots';
const MAX_SNAPSHOTS = 5;

/**
 * Creates a comprehensive backup payload from current application data.
 */
export function createBackupPayload(params: {
  gyms: Gym[];
  areas: GymArea[];
  boulders: Boulder[];
  attempts: Attempt[];
  comments: Comment[];
  profiles: Profile[];
  featureRequests?: FeatureRequest[];
  propsMap?: Record<string, string[]>;
}): WhamBackupData {
  let climberCustomizations: Record<string, any> = {};
  try {
    const raw = localStorage.getItem('wham_climber_customizations');
    if (raw) climberCustomizations = JSON.parse(raw);
  } catch {
    // Ignore
  }

  return {
    version: 1,
    appName: 'Wham',
    exportedAt: new Date().toISOString(),
    gyms: params.gyms,
    areas: params.areas,
    boulders: params.boulders,
    attempts: params.attempts,
    comments: params.comments,
    profiles: params.profiles,
    featureRequests: params.featureRequests || [],
    climberCustomizations,
    sendsProps: params.propsMap || {}
  };
}

/**
 * Downloads a backup payload as a JSON file.
 */
export function downloadBackupFile(backup: WhamBackupData): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `wham-backup-${dateStr}.json`;
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a backup JSON string.
 */
export function validateAndParseBackup(jsonStr: string): {
  valid: boolean;
  data?: WhamBackupData;
  summary?: BackupSummary;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid file format: content is not a JSON object.' };
    }

    // Check minimum required arrays
    if (!Array.isArray(parsed.boulders) && !Array.isArray(parsed.attempts)) {
      return {
        valid: false,
        error: 'Invalid Wham backup: missing boulders or attempts data.'
      };
    }

    const boulders: Boulder[] = Array.isArray(parsed.boulders) ? parsed.boulders : [];
    const attempts: Attempt[] = Array.isArray(parsed.attempts) ? parsed.attempts : [];
    const comments: Comment[] = Array.isArray(parsed.comments) ? parsed.comments : [];
    const profiles: Profile[] = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const gyms: Gym[] = Array.isArray(parsed.gyms) ? parsed.gyms : [];
    const areas: GymArea[] = Array.isArray(parsed.areas) ? parsed.areas : [];
    const featureRequests: FeatureRequest[] = Array.isArray(parsed.featureRequests) ? parsed.featureRequests : [];

    const data: WhamBackupData = {
      version: 1,
      appName: 'Wham',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      gyms,
      areas,
      boulders,
      attempts,
      comments,
      profiles,
      featureRequests,
      climberCustomizations: parsed.climberCustomizations || {},
      sendsProps: parsed.sendsProps || {}
    };

    const summary: BackupSummary = {
      exportedAt: data.exportedAt,
      boulderCount: boulders.length,
      attemptCount: attempts.length,
      commentCount: comments.length,
      climberCount: profiles.length,
      gymCount: gyms.length,
      areaCount: areas.length
    };

    return { valid: true, data, summary };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Failed to parse JSON file.' };
  }
}

/**
 * Saves a rolling local snapshot into localStorage as an automatic safety net.
 */
export function saveLocalSnapshot(
  backup: WhamBackupData,
  reason: string = 'Automatic safety net'
): void {
  try {
    const snapshotId = `snap_${Date.now()}`;
    const newEntry = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      boulderCount: backup.boulders.length,
      attemptCount: backup.attempts.length,
      climberCount: backup.profiles.length,
      reason,
      data: backup
    };

    const existingJson = localStorage.getItem(SNAPSHOTS_KEY);
    let list: any[] = [];
    if (existingJson) {
      try {
        list = JSON.parse(existingJson);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }

    // Keep up to MAX_SNAPSHOTS
    list.unshift(newEntry);
    if (list.length > MAX_SNAPSHOTS) {
      list = list.slice(0, MAX_SNAPSHOTS);
    }

    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save local rolling snapshot (localStorage quota may be full):', e);
  }
}

/**
 * Retrieves metadata for all stored rolling snapshots.
 */
export function getLocalSnapshotsMeta(): LocalSnapshotMeta[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      boulderCount: item.boulderCount ?? item.data?.boulders?.length ?? 0,
      attemptCount: item.attemptCount ?? item.data?.attempts?.length ?? 0,
      climberCount: item.climberCount ?? item.data?.profiles?.length ?? 0,
      reason: item.reason
    }));
  } catch {
    return [];
  }
}

/**
 * Retrieves the full data for a specific local snapshot.
 */
export function getLocalSnapshotData(snapshotId: string): WhamBackupData | null {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    const match = list.find((item) => item.id === snapshotId);
    return match ? match.data : null;
  } catch {
    return null;
  }
}
