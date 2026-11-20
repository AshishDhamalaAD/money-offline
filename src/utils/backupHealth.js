export const DAY_MS = 24 * 60 * 60 * 1000
export const BACKUP_INTERVALS = [0, 7, 14, 30]
export const BACKUP_SETTING_KEYS = [
  'lastBackupGeneratedAt',
  'backupReminderIntervalDays',
  'backupReminderSnoozedUntil',
  'storageWarningSnoozedUntil',
]

export function isBackupDue({ lastBackupGeneratedAt, backupReminderIntervalDays, backupReminderSnoozedUntil }, now) {
  if (!BACKUP_INTERVALS.includes(backupReminderIntervalDays) || backupReminderIntervalDays === 0) return false
  if (backupReminderSnoozedUntil > now) return false
  const generatedAt = Date.parse(lastBackupGeneratedAt)
  return !Number.isFinite(generatedAt) || now - generatedAt >= backupReminderIntervalDays * DAY_MS
}

export function normalizeStorageEstimate(estimate) {
  const usage = estimate?.usage
  const quota = estimate?.quota
  if (!Number.isFinite(usage) || usage < 0 || !Number.isFinite(quota) || quota <= 0) return null
  return { usage, quota, percent: usage / quota * 100 }
}

export function formatStorageBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toLocaleString(undefined, { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`
}
