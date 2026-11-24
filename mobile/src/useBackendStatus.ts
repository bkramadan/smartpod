import { getHealth } from '@smartpod/shared';
import { useEffect, useState } from 'react';
import { API_URL } from './config';

export type BackendStatus = 'checking' | 'online' | 'offline';

/** Checks once, when the app opens, whether the backend is reachable. */
export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    getHealth(API_URL)
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return status;
}
