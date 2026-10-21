import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');
const optionalDate = z.union([date, z.literal('')]).default('');
export const cycleSummarySchema = z.object({
  consent: z.literal(true),
  periods: z.array(z.object({ startDate: date, endDate: optionalDate }).refine(p => !p.endDate || p.endDate >= p.startDate, 'Period end must follow its start.')).max(200),
  checkIns: z.array(z.object({
    date, periodEnd: optionalDate,
    flow: z.string().max(40).default(''), mood: z.string().max(80).default(''),
    symptoms: z.array(z.string().max(100)).max(20).default([]),
    notes: z.string().max(4000).default(''),
  })).max(500),
}).refine(d => d.periods.length > 0 || d.checkIns.length > 0, 'Save cycle dates or a check-in first.');
export type CycleSummaryInput = z.infer<typeof cycleSummarySchema>;

export function selectCycleSummaryData(cycle: { periods: CycleSummaryInput['periods']; checkIns: CycleSummaryInput['checkIns'] }) {
  return {
    consent: true as const,
    periods: cycle.periods.map(({ startDate, endDate }) => ({ startDate, endDate: endDate ?? '' })),
    checkIns: cycle.checkIns.map(({ date, periodEnd, flow, mood, symptoms, notes }) => ({ date, periodEnd: periodEnd ?? '', flow: flow ?? '', mood: mood ?? '', symptoms: symptoms ?? [], notes: notes ?? '' })),
  };
}