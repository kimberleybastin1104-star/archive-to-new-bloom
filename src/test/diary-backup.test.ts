import { describe, expect, it } from "vitest";
import { buildBackup, readBackup } from "@/lib/diary-backup";

describe("diary backup", () => {
  it("restores a backup made by this app", () => {
    const data = { sessions: [{ id: 1 }] };
    expect(readBackup(JSON.stringify(buildBackup(data)))).toEqual(data);
  });
  it("accepts the old app's saved diary", () => {
    expect(readBackup(JSON.stringify({ journal: "hi", sessions: [] }))).toEqual({ journal: "hi", sessions: [] });
  });
  it("accepts the old app's saved diary keyed by its storage name", () => {
    const raw = JSON.stringify({ "gym-diary-planner-v1": JSON.stringify({ journal: "x" }) });
    expect(readBackup(raw)).toEqual({ journal: "x" });
  });
  it("rejects unrelated files", () => {
    expect(() => readBackup(JSON.stringify({ foo: 1 }))).toThrow();
  });
});
