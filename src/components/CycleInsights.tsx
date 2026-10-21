import { useEffect, useRef, useState } from 'react';
import { Sparkles, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleSummarySchema, selectCycleSummaryData, type CycleSummaryInput } from '@/lib/cycle-summary';

export function CycleInsights({ cycle }: { cycle: { periods: CycleSummaryInput['periods']; checkIns: CycleSummaryInput['checkIns'] } }) {
  const [consent, setConsent] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [snapshot, setSnapshot] = useState('');
  const abort = useRef<AbortController | null>(null);
  const payload = selectCycleSummaryData(cycle);
  const fingerprint = JSON.stringify(payload);
  useEffect(() => () => abort.current?.abort(), []);

  const generate = async () => {
    if (!consent || busy) return;
    const checked = cycleSummarySchema.safeParse(payload);
    if (!checked.success) { setError(checked.error.issues[0]?.message ?? 'Check your cycle entries.'); return; }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setSummary(''); setError(''); setStopped(false); setSnapshot(fingerprint);
    try {
      const response = await fetch('/api/cycle-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checked.data), signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.message ?? 'AI is unavailable.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No summary was received.');
      const decoder = new TextDecoder();
      let buffer = '', completed = false;
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === 'text') setSummary(old => old + event.text);
          if (event.type === 'error') throw new Error(event.message);
          if (event.type === 'done') completed = true;
        }
        if (chunk.done) break;
      }
      if (!completed) throw new Error('The summary ended early.');
    } catch (failure) {
      if (controller.signal.aborted) setStopped(true);
      else setError(failure instanceof Error ? failure.message : 'AI could not complete the summary.');
    } finally { setBusy(false); abort.current = null; }
  };

  return <section className="cycle-insights" aria-labelledby="cycle-insights-title">
    <h2 className="card-title" id="cycle-insights-title"><Sparkles size={18} />Your cycle patterns · AI</h2>
    <p className="muted">{cycle.periods.length} period records · {cycle.checkIns.length} saved check-ins</p>
    <label className="insights-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
      <span>I agree to send my saved cycle dates, flow, mood, symptoms and check-in notes to Lovable AI for this summary. Other diary pages and unsaved notes are excluded.</span>
    </label>
    <p className="insights-disclaimer muted">AI observations may be wrong. Not medical advice, a diagnosis, or a fertility or contraception guide. AI usage may use paid credits.</p>
    <div className="insights-actions">
      <Button className="btn primary" disabled={!consent || busy || (!cycle.periods.length && !cycle.checkIns.length)} onClick={generate}><Sparkles />{summary ? 'Refresh summary' : 'Summarize my patterns'}</Button>
      {busy && <Button className="btn" variant="outline" onClick={() => abort.current?.abort()}><Square />Stop</Button>}
      {!busy && summary && <Button className="btn" variant="outline" onClick={() => { setSummary(''); setError(''); setStopped(false); }}><Trash2 />Clear summary</Button>}
    </div>
    {busy && <p role="status" className="muted">{summary ? 'Writing your summary…' : 'Looking through your saved cycle entries…'}</p>}
    {error && <p role="alert" className="insights-error">{error}</p>}
    {stopped && <p role="status" className="muted">Stopped — any text below is incomplete.</p>}
    {summary && <div className="insights-result"><p className="muted">{snapshot !== fingerprint ? 'Your diary has changed since this summary.' : 'Based on the entries shared for this request.'}</p><div data-testid="cycle-ai-summary">{summary}</div></div>}
  </section>;
}