/**
 * Mock sign-in: pick a demo account. With a real backend this becomes an email +
 * password (or magic link) form, and doctors' licences are verified first.
 */
import { useState } from 'react';
import type { DemoAccount, User } from '@smartpod/shared';
import { api, API_URL } from '../api.ts';
import { roleLabel, useLoad } from '../lib.ts';

const roleHelp: Record<string, string> = {
  doctor: 'Monitor patients, add and edit prescriptions',
  pharmacist: 'See prescriptions, track usage and pill levels',
  caregiver: 'Follow adherence and get missed-dose alerts',
  patient: 'Patients mainly use the mobile app; this shows their own record',
};

export function Login({ onSignIn }: { onSignIn: (token: string, user: User) => void }) {
  const health = useLoad(() => api.health());
  const accounts = useLoad(() => api.accounts());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const pick = async (a: DemoAccount) => {
    setBusy(a.id);
    setError('');
    try {
      const { token, user } = await api.login(a.id);
      onSignIn(token, user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    if (!confirm('Restore the demo data? Changes you made will be lost.')) return;
    await api.resetDemo();
    accounts.reload();
  };

  const order = ['doctor', 'pharmacist', 'caregiver', 'patient'];
  const sorted = [...(accounts.data ?? [])].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand big"><span className="brand-mark" aria-hidden>◉</span> Smart Pod</div>
        <h1>Care dashboard</h1>
        <p className="muted">Choose a demo account to sign in. Everyone sees only the patients who shared access with them.</p>

        {health.error ? (
          <div className="alert bad">
            <b>The backend is not running.</b> Start it with <code>npm run dev</code> in the <code>backend</code> folder.
            <div className="small">Looking for it at {API_URL}</div>
          </div>
        ) : (
          <ul className="accounts">
            {sorted.map((a) => (
              <li key={a.id}>
                <button className="account" onClick={() => pick(a)} disabled={!!busy}>
                  <span className={`chip role-${a.role}`}>{roleLabel[a.role]}</span>
                  <span className="account-name">{a.name}</span>
                  <span className="account-help">
                    {a.segment === 'athlete' ? 'Athlete · supplements' : roleHelp[a.role]}
                  </span>
                  {busy === a.id && <span className="small">Signing in…</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <div className="alert bad">{error}</div>}
        <div className="login-foot">
          <span className="small muted">{health.data ? `Backend: ${health.data.mode} · AI: ${health.data.ai}` : ''}</span>
          <button className="link small" onClick={reset}>Reset demo data</button>
        </div>
      </div>
    </div>
  );
}
