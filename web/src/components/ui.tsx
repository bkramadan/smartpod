/** Small building blocks used across the screens. */
import type { ReactNode } from 'react';
import type { AdherenceSummary, AiReport, DoseStatus, Severity } from '@smartpod/shared';
import { adherenceTone, shortDay } from '../lib.ts';

export const ErrorBox = ({ message }: { message: string }) => <div className="alert bad">{message}</div>;

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="card empty">
    <h3>{title}</h3>
    <p className="muted">{children}</p>
  </div>
);

export const Percent = ({ value }: { value: number }) => (
  <span className={`pct ${adherenceTone(value)}`}>
    <span className="pct-bar"><span style={{ width: `${value}%` }} /></span>
    {value}%
  </span>
);

const statusLabel: Record<DoseStatus, string> = { due: 'Due', taken: 'Taken', missed: 'Missed', skipped: 'Skipped' };
const statusTone: Record<DoseStatus, string> = { due: 'neutral', taken: 'good', missed: 'bad', skipped: 'warn' };
export const StatusBadge = ({ status }: { status: DoseStatus }) => (
  <span className={`badge ${statusTone[status]}`}>{statusLabel[status]}</span>
);

const sevLabel: Record<Severity, string> = { serious: 'Serious', moderate: 'Moderate', minor: 'Minor' };
const sevTone: Record<Severity, string> = { serious: 'bad', moderate: 'warn', minor: 'neutral' };
export const SeverityBadge = ({ severity }: { severity: Severity }) => (
  <span className={`badge ${sevTone[severity]}`}>{sevLabel[severity]}</span>
);

/** Seven (or more) days of adherence as bars: taken in green, missed in red. */
export function AdherenceBars({ summary }: { summary: AdherenceSummary }) {
  const max = Math.max(1, ...summary.daily.map((d) => d.planned));
  return (
    <div className="bars" role="img" aria-label={`Adherence ${summary.percent}% over ${summary.days} days`}>
      {summary.daily.map((d) => (
        <div className="bar-col" key={d.day} title={`${d.taken} of ${d.planned} taken, ${d.missed} missed`}>
          <div className="bar-stack" style={{ height: `${(d.planned / max) * 100}%` }}>
            <span className="bar-missed" style={{ flex: d.missed }} />
            <span className="bar-other" style={{ flex: d.planned - d.taken - d.missed }} />
            <span className="bar-taken" style={{ flex: d.taken }} />
          </div>
          <div className="bar-label">{shortDay(d.day)}</div>
          <div className="bar-value">{d.planned ? `${d.taken}/${d.planned}` : '–'}</div>
        </div>
      ))}
    </div>
  );
}

/** The AI engine's findings: conflicts, best timing, food guidance. */
export function AiReportView({ report, compact = false }: { report: AiReport; compact?: boolean }) {
  return (
    <div className="ai">
      <div className="ai-explain">
        <div className="ai-tag">{report.explainedBy === 'claude' ? 'Explained by Claude' : 'AI summary'}</div>
        <p>{report.explanation}</p>
      </div>

      <h4>Conflicts</h4>
      {report.conflicts.length === 0 ? (
        <p className="muted">No conflicts found.</p>
      ) : (
        <ul className="conflicts">
          {report.conflicts.map((c) => (
            <li key={`${c.a}-${c.b}`} className={`conflict sev-${c.severity}`}>
              <div className="conflict-head">
                <SeverityBadge severity={c.severity} />
                <b>{c.aName} + {c.bName}</b>
                <span className="small muted">{c.type === 'item-food' ? 'food' : 'item'}</span>
              </div>
              <div>{c.reason}</div>
              <div className="small"><b>What to do:</b> {c.advice}</div>
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <>
          <h4>Best timing</h4>
          <table className="table">
            <thead><tr><th>Item</th><th>Suggested time</th><th>Why</th></tr></thead>
            <tbody>
              {report.timing.map((t) => (
                <tr key={t.itemId}><td className="strong">{t.name}</td><td>{t.suggestedTimes.join(', ')}</td><td className="small">{t.why}</td></tr>
              ))}
            </tbody>
          </table>
          {report.food.length > 0 && (
            <>
              <h4>Food guidance</h4>
              <ul className="tips">
                {report.food.map((f) => <li key={f.catalogId}><b>{f.name}:</b> {f.tip}</li>)}
              </ul>
            </>
          )}
        </>
      )}
      {compact && report.timing[0] && (
        <p className="small"><b>Suggested time:</b> {report.timing[0].suggestedTimes.join(', ')} — {report.timing[0].why}</p>
      )}
      <p className="disclaimer">{report.disclaimer}</p>
    </div>
  );
}
