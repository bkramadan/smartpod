/**
 * One patient. The tabs depend on the viewer's role:
 *   doctor      Overview · Prescriptions (edit) · AI report · History · Audit log
 *   pharmacist  Prescriptions (read) · Pill levels · AI report · History
 *   caregiver   Today · History
 *   patient     Overview · Prescriptions · AI report · History
 * The backend enforces the same rules, so hiding a tab is only for clarity.
 */
import { useState } from 'react';
import type { Role } from '@smartpod/shared';
import { api } from '../api.ts';
import { AdherenceBars, AiReportView, ErrorBox, Percent, StatusBadge } from '../components/ui.tsx';
import { dateTime, go, roleLabel, time, today, useLoad } from '../lib.ts';
import { Prescriptions } from './Prescriptions.tsx';

type Tab = 'overview' | 'prescriptions' | 'stock' | 'ai' | 'history' | 'audit';

const tabsFor: Record<Role, Tab[]> = {
  doctor: ['overview', 'prescriptions', 'ai', 'history', 'audit'],
  pharmacist: ['prescriptions', 'stock', 'ai', 'history'],
  caregiver: ['overview', 'history'],
  patient: ['overview', 'prescriptions', 'ai', 'history'],
};
const tabLabel: Record<Tab, string> = {
  overview: 'Overview', prescriptions: 'Prescriptions', stock: 'Pill levels', ai: 'AI report', history: 'History', audit: 'Audit log',
};

export function PatientDetail({ patientId, tab }: { patientId: string; tab?: string }) {
  const summary = useLoad(() => api.patient(patientId), [patientId]);
  if (summary.error) return <ErrorBox message={summary.error} />;
  if (!summary.data) return <p className="muted">Loading…</p>;

  const s = summary.data;
  const tabs = tabsFor[s.viewerRole];
  const active = (tabs.includes(tab as Tab) ? tab : tabs[0]) as Tab;

  return (
    <section>
      <a className="back" href="#/patients">← All patients</a>
      <div className="page-head row">
        <div>
          <h1>{s.patient.name}</h1>
          <p className="muted">
            {s.patient.segment === 'athlete' ? 'Athlete · supplements' : 'Medication'} · you are their {roleLabel[s.viewerRole].toLowerCase()}
          </p>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat-label">Adherence, 7 days</div><Percent value={s.adherence7} /></div>
          <div className="stat"><div className="stat-label">Missed today</div><div className={`stat-value ${s.missedToday ? 'bad' : ''}`}>{s.missedToday}</div></div>
          <div className="stat"><div className="stat-label">Low stock</div><div className={`stat-value ${s.lowStock ? 'warn' : ''}`}>{s.lowStock}</div></div>
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t} className={t === active ? 'tab active' : 'tab'} onClick={() => go(`/patients/${patientId}/${t}`)}>
            {s.viewerRole === 'caregiver' && t === 'overview' ? 'Today' : tabLabel[t]}
          </button>
        ))}
      </nav>

      {active === 'overview' && <Overview patientId={patientId} role={s.viewerRole} onChange={summary.reload} />}
      {active === 'prescriptions' && <Prescriptions patientId={patientId} role={s.viewerRole} onChange={summary.reload} />}
      {active === 'stock' && <Stock patientId={patientId} role={s.viewerRole} onChange={summary.reload} />}
      {active === 'ai' && <AiTab patientId={patientId} />}
      {active === 'history' && <History patientId={patientId} />}
      {active === 'audit' && <Audit patientId={patientId} />}
    </section>
  );
}

function Overview({ patientId, role, onChange }: { patientId: string; role: Role; onChange: () => void }) {
  const doses = useLoad(() => api.doses(patientId), [patientId]);
  const adherence = useLoad(() => api.adherence(patientId, 7), [patientId]);
  const [error, setError] = useState('');
  const canMark = role === 'caregiver' || role === 'patient';

  const mark = async (id: string, action: 'take' | 'skip') => {
    try {
      await (action === 'take' ? api.take(id) : api.skip(id));
      doses.reload();
      adherence.reload();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Today</h3>
        {error && <ErrorBox message={error} />}
        {doses.data?.length === 0 && <p className="muted">Nothing planned today.</p>}
        <ul className="doses">
          {doses.data?.map((d) => (
            <li key={d.id} className={`dose ${d.status}`}>
              <span className="dose-time">{time(d.plannedAt)}</span>
              <span className="dose-what">
                <b>{d.itemName}</b> {d.itemDose}
                {d.instructions && <span className="small muted"> · {d.instructions}</span>}
              </span>
              <StatusBadge status={d.status} />
              {d.status === 'taken' && <span className="small muted">by {d.confirmedBy === 'pod' ? 'Pod' : d.confirmedBy}</span>}
              {canMark && (d.status === 'due' || d.status === 'missed') && new Date(d.plannedAt).getTime() - Date.now() <= 2 * 3600000 && (
                <span className="dose-actions">
                  <button className="btn small" onClick={() => mark(d.id, 'take')}>Mark taken</button>
                  <button className="btn small ghost" onClick={() => mark(d.id, 'skip')}>Skip</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Last 7 days</h3>
        {adherence.data && <AdherenceBars summary={adherence.data} />}
        {adherence.data && (
          <p className="small muted">
            {adherence.data.taken} of {adherence.data.planned} doses taken · {adherence.data.missed} missed · {adherence.data.skipped} skipped
          </p>
        )}
      </div>
    </div>
  );
}

function Stock({ patientId, role, onChange }: { patientId: string; role: Role; onChange: () => void }) {
  const stock = useLoad(() => api.inventory(patientId), [patientId]);
  const adherence = useLoad(() => api.adherence(patientId, 30), [patientId]);
  const refill = async (itemId: string) => {
    const answer = prompt('How many pills were dispensed?', '30');
    const add = Number(answer);
    if (!answer || !Number.isInteger(add) || add <= 0) return;
    await api.refill(patientId, itemId, add);
    stock.reload();
    onChange();
  };
  return (
    <div className="card">
      <h3>Pill levels</h3>
      {stock.error && <ErrorBox message={stock.error} />}
      <table className="table">
        <thead><tr><th>Item</th><th>Type</th><th>Left</th><th>Per day</th><th>Days left</th><th></th></tr></thead>
        <tbody>
          {stock.data?.map((s) => (
            <tr key={s.itemId}>
              <td className="strong">{s.itemName}</td>
              <td>{s.kind === 'medicine' ? 'Medicine' : 'Supplement'}</td>
              <td>{s.count} {s.low && <span className="badge warn">Refill</span>}</td>
              <td>{s.perDay}</td>
              <td>{s.daysLeft}</td>
              <td>{role === 'pharmacist' && <button className="btn small" onClick={() => refill(s.itemId)}>Record refill</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {adherence.data && (
        <p className="small muted">Usage over 30 days: {adherence.data.taken} doses taken of {adherence.data.planned} planned ({adherence.data.percent}%).</p>
      )}
    </div>
  );
}

function AiTab({ patientId }: { patientId: string }) {
  const report = useLoad(() => api.report(patientId), [patientId]);
  return (
    <div className="card">
      <h3>AI report for everything they take</h3>
      {report.error && <ErrorBox message={report.error} />}
      {report.loading && !report.data && <p className="muted">The AI engine is checking…</p>}
      {report.data && <AiReportView report={report.data} />}
    </div>
  );
}

function History({ patientId }: { patientId: string }) {
  const [day, setDay] = useState(today());
  const doses = useLoad(() => api.doses(patientId, day), [patientId, day]);
  const adherence = useLoad(() => api.adherence(patientId, 14), [patientId]);
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Last 14 days</h3>
        {adherence.data && <AdherenceBars summary={adherence.data} />}
      </div>
      <div className="card">
        <div className="row">
          <h3>Doses on</h3>
          <input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
        </div>
        {doses.data?.length === 0 && <p className="muted">No doses recorded that day.</p>}
        <table className="table">
          <tbody>
            {doses.data?.map((d) => (
              <tr key={d.id}>
                <td>{time(d.plannedAt)}</td>
                <td className="strong">{d.itemName}</td>
                <td><StatusBadge status={d.status} /></td>
                <td className="small muted">
                  {d.actualAt && d.status === 'taken' ? `at ${time(d.actualAt)} · ${d.confirmedBy === 'pod' ? 'confirmed by Pod' : `confirmed by ${d.confirmedBy}`}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Audit({ patientId }: { patientId: string }) {
  const rows = useLoad(() => api.audit(patientId), [patientId]);
  return (
    <div className="card">
      <h3>Audit log</h3>
      <p className="small muted">Every change to this patient's record: who, what and when.</p>
      <table className="table">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>
          {rows.data?.map((a) => (
            <tr key={a.id}><td>{dateTime(a.at)}</td><td>{a.actorName}</td><td><code>{a.action}</code></td><td className="small">{a.detail}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
