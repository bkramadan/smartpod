import { getHealth } from '@smartpod/shared';
import { useEffect, useState } from 'react';

export type BackendStatus = 'checking' | 'online' | 'offline';

/** Checks once, when the page opens, whether the backend is reachable. */
export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    // "" = same address as this page; Vite forwards /api to the backend.
    getHealth('')
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return status;
}
