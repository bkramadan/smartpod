import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useBackendStatus, type BackendStatus } from './useBackendStatus.ts';

const STATUS_TEXT: Record<BackendStatus, string> = {
  checking: 'Checking backend…',
  online: 'Backend: online',
  offline: 'Backend: offline. Is it running?',
};

// Colour is a hint only; the text always says the status, so it works without colour.
const STATUS_COLOUR: Record<BackendStatus, string> = {
  checking: 'text-muted-foreground',
  online: 'text-foreground',
  offline: 'text-destructive',
};

/** Root screen of the web dashboard. */
export function App() {
  const status = useBackendStatus();

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Smart Pod</h1>
          </CardTitle>
          <CardDescription>Medication dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p role="status" className={STATUS_COLOUR[status]}>
            {STATUS_TEXT[status]}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
