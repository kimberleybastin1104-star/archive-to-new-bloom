export const BACKUP_APP = "gym-diary-planner";

export function buildBackup(data: unknown) {
  return { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), data };
}

/**
 * Accepts a backup made by this app, or the raw saved diary from the old
 * Gym Diary Planner (the value stored under "gym-diary-planner-v1").
 */
export function readBackup(text: string): Record<string, unknown> {
  let parsed: any = JSON.parse(text);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (parsed.app === BACKUP_APP && parsed.data && typeof parsed.data === "object") return parsed.data;
    if (parsed["gym-diary-planner-v1"]) return readBackup(JSON.stringify(parsed["gym-diary-planner-v1"]));
    const known = ["weekly", "sessions", "habits", "goals", "nutrition", "cycle", "journal"];
    if (known.some((k) => k in parsed)) return parsed;
  }
  throw new Error("Not a Gym Diary backup");
}
