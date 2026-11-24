import { useBackendStatus, type BackendStatus } from './useBackendStatus.ts';

const STATUS_TEXT: Record<BackendStatus, string> = {
  checking: 'Checking backend…',
  online: 'Backend: online',
  offline: 'Backend: offline. Is it running?',
};

/** Root screen of the web dashboard. */
export function App() {
  const status = useBackendStatus();

  return (
    <main>
      <h1>Smart Pod</h1>
      <p role="status">{STATUS_TEXT[status]}</p>
    </main>
  );
}
