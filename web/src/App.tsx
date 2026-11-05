/**
 * The web dashboards: one app, three roles (doctor, pharmacist, caregiver).
 * What each person sees depends on their role — see pages/PatientDetail.tsx.
 */
import { useEffect, useState } from 'react';
import type { User } from '@smartpod/shared';
import { api, hasToken, setToken } from './api.ts';
import { go, roleLabel, useRoute } from './lib.ts';
import { Login } from './pages/Login.tsx';
import { Notifications } from './pages/Notifications.tsx';
import { PatientDetail } from './pages/PatientDetail.tsx';
import { PatientList } from './pages/PatientList.tsx';
import { UserContext } from './user.ts';


export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(hasToken());
  const route = useRoute();

  useEffect(() => {
    if (!hasToken()) return;
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const signIn = (token: string, u: User) => {
    setToken(token);
    setUser(u);
    go('/patients');
  };
  const signOut = () => {
    setToken(null);
    setUser(null);
    go('/');
  };

  if (checking) return <div className="center muted">Loading…</div>;
  if (!user) return <Login onSignIn={signIn} />;

  let page;
  if (route[0] === 'patients' && route[1]) page = <PatientDetail patientId={route[1]} tab={route[2]} />;
  else if (route[0] === 'notifications') page = <Notifications />;
  else page = <PatientList />;

  return (
    <UserContext.Provider value={user}>
      <Header user={user} onSignOut={signOut} />
      <main className="page">{page}</main>
      <footer className="footer">
        Smart Pod prototype · mock data · AI findings use demo rules and are not medical advice
      </footer>
    </UserContext.Provider>
  );
}

function Header({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => api.notifications().then((n) => setUnread(n.filter((x) => !x.readAt).length)).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('smartpod:notifications', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('smartpod:notifications', load);
    };
  }, []);

  return (
    <header className="header">
      <a className="brand" href="#/patients">
        <span className="brand-mark" aria-hidden>◉</span> Smart Pod <span className="brand-sub">Care dashboard</span>
      </a>
      <nav className="header-nav">
        <a href="#/patients">Patients</a>
        <a href="#/notifications" className="bell">
          Alerts{unread > 0 && <span className="count">{unread}</span>}
        </a>
      </nav>
      <div className="header-user">
        <span className={`chip role-${user.role}`}>{roleLabel[user.role]}</span>
        <span>{user.name}</span>
        <button className="link" onClick={onSignOut}>Sign out</button>
      </div>
    </header>
  );
}
