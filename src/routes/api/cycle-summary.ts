import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/cycle-summary')({
  server: { handlers: { POST: async ({ request }) => {
    const { handleCycleSummary } = await import('@/lib/cycle-summary.server');
    return handleCycleSummary(request);
  } } },
});