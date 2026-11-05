/** Small helpers shared by the screens: routing, formatting, data loading. */
import { useCallback, useEffect, useState } from 'react';
import type { Role } from '@smartpod/shared';

/* ---------- A tiny router: the page is chosen by the part after # in the URL ---------- */

export function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState<string[]>(read);
  useEffect(() => {
    const onChange = () => setParts(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parts;
}

export const go = (path: string) => {
  window.location.hash = path;
};

/* ---------- Load data and reload it when needed ---------- */

export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload };
}

/* ---------- Formatting ---------- */

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const shortDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric' });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const roleLabel: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  caregiver: 'Caregiver',
};

export const adherenceTone = (pct: number) => (pct >= 90 ? 'good' : pct >= 75 ? 'warn' : 'bad');
