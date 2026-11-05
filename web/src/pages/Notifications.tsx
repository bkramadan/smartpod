/** Alerts for the signed-in person: missed doses, conflicts, refills, Pod problems. */
import type { NotificationKind } from '@smartpod/shared';
import { api } from '../api.ts';
import { Empty, ErrorBox } from '../components/ui.tsx';
import { dateTime, useLoad } from '../lib.ts';

const kindLabel: Record<NotificationKind, string> = {
  reminder: 'Reminder',
  'missed-dose': 'Missed dose',
  'conflict-warning': 'Conflict',
  'prescription-changed': 'Prescription',
  refill: 'Refill',
  device: 'Pod',
};
const kindTone: Record<NotificationKind, string> = {
  reminder: 'neutral', 'missed-dose': 'bad', 'conflict-warning': 'bad', 'prescription-changed': 'soft', refill: 'warn', device: 'warn',
};

export function Notifications() {
  const list = useLoad(() => api.notifications());
  const readAll = async () => {
    await api.readAll();
    list.reload();
    window.dispatchEvent(new Event('smartpod:notifications'));
  };
  return (
    <section>
      <div className="page-head row">
        <h1>Alerts</h1>
        <button className="btn ghost" onClick={readAll}>Mark all as read</button>
      </div>
      {list.error && <ErrorBox message={list.error} />}
      {list.data?.length === 0 && <Empty title="No alerts">You are all caught up.</Empty>}
      <ul className="alerts">
        {list.data?.map((n) => (
          <li key={n.id} className={n.readAt ? 'alert-row read' : 'alert-row'}>
            <span className={`badge ${kindTone[n.kind]}`}>{kindLabel[n.kind]}</span>
            <div>
              <div className="strong">
                {n.patientId ? <a href={`#/patients/${n.patientId}`}>{n.title}</a> : n.title}
              </div>
              <div className="small">{n.body}</div>
            </div>
            <span className="small muted">{dateTime(n.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
