/** The first screen after sign-in: every patient who shared access with you. */
import { api } from '../api.ts';
import { useUser } from '../user.ts';
import { Empty, ErrorBox, Percent } from '../components/ui.tsx';
import { go, time, useLoad } from '../lib.ts';

const titles = {
  doctor: 'My patients',
  pharmacist: 'Patients and their medication stock',
  caregiver: 'People I care for',
  patient: 'My record',
};

export function PatientList() {
  const user = useUser();
  const { data, error, loading } = useLoad(() => api.patients());

  return (
    <section>
      <div className="page-head">
        <h1>{titles[user.role]}</h1>
        <p className="muted">Shared with you by the patient. Click a row to open it.</p>
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.length === 0 && (
        <Empty title="No patients yet">
          A patient adds you from the mobile app (Sharing → add by email). Then they appear here.
        </Empty>
      )}
      {data && data.length > 0 && (
        <div className="card">
          <table className="table clickable">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Adherence, 7 days</th>
                <th>Missed today</th>
                <th>Next dose</th>
                <th>Items</th>
                <th>Low stock</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.patient.id} onClick={() => go(`/patients/${s.patient.id}`)}>
                  <td>
                    <div className="strong">{s.patient.name}</div>
                    <div className="small muted">
                      {s.patient.segment === 'athlete' ? 'Athlete' : s.patient.segment === 'wellness' ? 'Wellness' : 'Medication'}
                    </div>
                  </td>
                  <td><Percent value={s.adherence7} /></td>
                  <td>{s.missedToday ? <span className="badge bad">{s.missedToday} missed</span> : <span className="muted">None</span>}</td>
                  <td>{s.nextDose ? `${time(s.nextDose.plannedAt)} · ${s.nextDose.itemName}` : <span className="muted">Done for today</span>}</td>
                  <td>{s.activeItems}</td>
                  <td>{s.lowStock ? <span className="badge warn">{s.lowStock} low</span> : <span className="muted">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
