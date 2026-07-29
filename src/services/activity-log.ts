import { kv } from '@/services/storage';

export interface ActivityEntry {
  id: string;
  label: string;
  tone: 'success' | 'neutral' | 'warning' | 'danger';
  at: string; // ISO timestamp
}

const STORAGE_KEY = 'openDispatch.activityLog';
const MAX_ENTRIES = 20;

/**
 * Small MMKV-backed activity log for the Sync & Diagnostics screen's
 * "Recent Activity" timeline (Phase 8). Real events pushed from real
 * places in the app (sign-in, status updates, token refresh, connectivity
 * changes, manual pull-to-refresh) — not fabricated demo data.
 */
export function logActivity(label: string, tone: ActivityEntry['tone'] = 'neutral') {
  const existing = kv.getJson<ActivityEntry[]>(STORAGE_KEY) ?? [];
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    tone,
    at: new Date().toISOString(),
  };
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  kv.setJson(STORAGE_KEY, next);
}

export function getActivityLog(): ActivityEntry[] {
  return kv.getJson<ActivityEntry[]>(STORAGE_KEY) ?? [];
}

export function clearActivityLog() {
  kv.remove(STORAGE_KEY);
}
