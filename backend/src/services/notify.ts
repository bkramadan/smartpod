/**
 * NOTIFICATIONS AND AUDIT LOG.
 *
 * In the mock version a notification is a row the apps read (and show as a list or
 * badge). With a real backend the same function also sends a push message to the phone.
 */
import type { Notification } from '@smartpod/shared';
import { newId, type Deps } from './deps.ts';

export async function notify(
  deps: Deps,
  userIds: string[],
  n: Pick<Notification, 'kind' | 'title' | 'body' | 'patientId'>,
) {
  const createdAt = deps.now().toISOString();
  for (const userId of new Set(userIds)) {
    await deps.store.notifications.insert({ id: newId('n'), userId, createdAt, ...n });
    // Later: send a push notification here (Expo push service). See docs/MOVING-TO-SUPABASE.md.
  }
}

export async function audit(
  deps: Deps,
  actorId: string,
  action: string,
  patientId?: string,
  recordId?: string,
  detail?: string,
) {
  await deps.store.audit.insert({ id: newId('a'), actorId, action, patientId, recordId, detail, at: deps.now().toISOString() });
}
