import { describe, expect, it } from 'vitest';
import { cycleSummarySchema, selectCycleSummaryData } from '../lib/cycle-summary';

describe('cycle summary data', () => {
  const input = { consent: true, periods: [{ startDate: '2026-10-01', endDate: '2026-10-05' }], checkIns: [{ date: '2026-10-02', notes: 'Cramps again', mood: 'Low', flow: 'Medium', symptoms: ['Cramps'], periodEnd: '2026-10-05' }] };
  it('includes supplied cycle dates and check-in notes', () => {
    const result = cycleSummarySchema.parse(input);
    expect(result.periods[0]).toEqual({ startDate: '2026-10-01', endDate: '2026-10-05' });
    expect(result.checkIns[0].notes).toBe('Cramps again');
  });
  it('requires permission before AI processing', () => {
    expect(cycleSummarySchema.safeParse({ ...input, consent: false }).success).toBe(false);
  });
  it('excludes unrelated diary entries, IDs and unsaved notes', () => {
    const result = selectCycleSummaryData({ ...input, checkInDraft: { notes: 'private unsaved' }, journal: 'private journal' } as typeof input);
    expect(Object.keys(result).sort()).toEqual(['checkIns', 'consent', 'periods']);
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('rejects invalid dates and reversed period dates', () => {
    expect(cycleSummarySchema.safeParse({ ...input, periods: [{ startDate: '2026-02-30' }] }).success).toBe(false);
    expect(cycleSummarySchema.safeParse({ ...input, periods: [{ startDate: '2026-10-05', endDate: '2026-10-01' }] }).success).toBe(false);
  });
  it('does not send an empty diary', () => {
    expect(cycleSummarySchema.safeParse({ consent: true, periods: [], checkIns: [] }).success).toBe(false);
  });
});