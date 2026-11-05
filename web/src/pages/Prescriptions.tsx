/**
 * Prescriptions and supplements for one patient.
 * Doctors add, edit and stop items here. Every save is checked by the AI engine first;
 * a serious conflict must be confirmed before it is saved.
 */
import { useState } from 'react';
import type { AiReport, Item, Role } from '@smartpod/shared';
import { api, ApiError } from '../api.ts';
import { AiReportView, ErrorBox } from '../components/ui.tsx';
import { useLoad } from '../lib.ts';

export function Prescriptions({ patientId, role, onChange }: { patientId: string; role: Role; onChange: () => void }) {
  const items = useLoad(() => api.items(patientId), [patientId]);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const canEdit = role === 'doctor';

  const stop = async (item: Item) => {
    if (!confirm(`Stop ${item.name}? Future doses will be removed.`)) return;
    await api.stopItem(patientId, item.id);
    items.reload();
    onChange();
  };

  return (
    <div className="card">
      <div className="row">
        <h3>Prescriptions and supplements</h3>
        {canEdit && !editing && <button className="btn" onClick={() => setEditing('new')}>+ Add prescription</button>}
      </div>
      {role === 'pharmacist' && <p className="small muted">Read only. Only the doctor can change prescriptions.</p>}
      {items.error && <ErrorBox message={items.error} />}

      {editing && (
        <ItemForm
          patientId={patientId}
          item={editing === 'new' ? undefined : editing}
          onDone={() => { setEditing(null); items.reload(); onChange(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <table className="table">
        <thead>
          <tr><th>Item</th><th>Type</th><th>Dose</th><th>Times</th><th>Instructions</th>{canEdit && <th></th>}</tr>
        </thead>
        <tbody>
          {items.data?.map((i) => (
            <tr key={i.id}>
              <td className="strong">{i.name}</td>
              <td>{i.kind === 'medicine' ? <span className="badge neutral">Prescription</span> : <span className="badge soft">Supplement</span>}</td>
              <td>{i.dose}</td>
              <td>{i.times.join(', ')}</td>
              <td className="small">{i.instructions}</td>
              {canEdit && (
                <td className="actions">
                  <button className="btn small ghost" onClick={() => setEditing(i)}>Edit</button>
                  <button className="btn small ghost danger" onClick={() => stop(i)}>Stop</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseTimes(text: string) {
  return text.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean).map((t) => (t.length === 4 ? `0${t}` : t));
}

function ItemForm({ patientId, item, onDone, onCancel }: { patientId: string; item?: Item; onDone: () => void; onCancel: () => void }) {
  const catalog = useLoad(() => api.catalog());
  const [catalogId, setCatalogId] = useState(item?.catalogId ?? '');
  const [dose, setDose] = useState(item?.dose ?? '');
  const [times, setTimes] = useState(item?.times.join(', ') ?? '');
  const [perDay, setPerDay] = useState(1);
  const [instructions, setInstructions] = useState(item?.instructions ?? '');
  const [report, setReport] = useState<AiReport>();
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const entry = catalog.data?.items.find((c) => c.id === catalogId);
  const timeList = parseTimes(times);
  const badTime = timeList.find((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t));

  const input = () => ({
    catalogId,
    dose: dose || entry?.typicalDose,
    times: timeList.length ? timeList : undefined,
    timesPerDay: timeList.length ? undefined : perDay,
    instructions,
  });

  const check = async () => {
    setError('');
    try {
      setReport(await api.check(patientId, { ...input(), replacesItemId: item?.id }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = async (confirmSerious = false) => {
    setBusy(true);
    setError('');
    try {
      const result = item
        ? await api.updateItem(patientId, item.id, { dose, times: timeList, instructions })
        : await api.addItem(patientId, { ...input(), confirm: confirmSerious });
      setReport(result.report);
      window.dispatchEvent(new Event('smartpod:notifications'));
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.report) {
        setReport(e.body.report);
        if (e.body.canConfirm) setNeedsConfirm(true);
        else setError(e.message);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-panel">
      <h4>{item ? `Edit ${item.name}` : 'New prescription'}</h4>
      <div className="form-grid">
        <label>
          Medicine or supplement
          <select value={catalogId} disabled={!!item} onChange={(e) => { setCatalogId(e.target.value); setReport(undefined); setNeedsConfirm(false); }}>
            <option value="">Choose…</option>
            <optgroup label="Medicines">
              {catalog.data?.items.filter((c) => c.kind === 'medicine').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Supplements">
              {catalog.data?.items.filter((c) => c.kind === 'supplement').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          </select>
        </label>
        <label>
          Dose
          <input value={dose} placeholder={entry?.typicalDose ?? 'e.g. 5 mg'} onChange={(e) => setDose(e.target.value)} />
        </label>
        <label>
          Times (24h, comma separated)
          <input value={times} placeholder="Leave empty: AI suggests" onChange={(e) => setTimes(e.target.value)} />
          {badTime && <span className="field-error">“{badTime}” should look like 08:00</span>}
        </label>
        {!item && !timeList.length && (
          <label>
            Doses per day
            <select value={perDay} onChange={(e) => setPerDay(Number(e.target.value))}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <label className="wide">
          Instructions for the patient
          <input value={instructions} placeholder="e.g. With food" onChange={(e) => setInstructions(e.target.value)} />
        </label>
      </div>
      {entry && <p className="small muted">Timing note: {entry.timingWhy}</p>}
      {error && <ErrorBox message={error} />}

      {report && (
        <div className={needsConfirm ? 'confirm-box' : 'check-box'}>
          {needsConfirm && <div className="confirm-title">Serious conflict found. Check before saving.</div>}
          <AiReportView report={report} compact />
        </div>
      )}

      <div className="form-actions">
        <button className="btn ghost" onClick={check} disabled={!catalogId || !!badTime}>Check with AI</button>
        {needsConfirm ? (
          <button className="btn danger" onClick={() => save(true)} disabled={busy}>I confirm: save anyway</button>
        ) : (
          <button className="btn" onClick={() => save()} disabled={!catalogId || !!badTime || busy}>{busy ? 'Saving…' : 'Save'}</button>
        )}
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
