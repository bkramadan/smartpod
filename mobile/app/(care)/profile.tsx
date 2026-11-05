/** Profile for doctors, pharmacists and caregivers. */
import { router } from 'expo-router';
import { useAuth, useUser } from '../../src/auth';
import { Body, Button, Card, Muted, Screen } from '../../src/ui';

export default function Profile() {
  const user = useUser();
  const { signOut } = useAuth();
  return (
    <Screen>
      <Card>
        <Body bold>{user.name}</Body>
        <Muted>{user.email} · {user.role}</Muted>
        {user.role === 'doctor' && <Muted>Licence: {user.licenceNumber ?? 'not set'} (verification pending in the prototype)</Muted>}
      </Card>
      <Card>
        <Muted>Patients share access with you from their app, using your email. You see only those patients.</Muted>
      </Card>
      <Button kind="ghost" label="Sign out" onPress={() => { signOut(); router.replace('/'); }} />
    </Screen>
  );
}
