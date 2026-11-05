/**
 * Me: alerts, who can see my data (consent), my daily routine, sign out.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { DailyRoutine } from '@smartpod/shared';
import { api } from '../../src/api';
import { useAuth, useUser } from '../../src/auth';
import { ago, colors, space } from '../../src/theme';
import { Badge, Body, Button, Card, ErrorText, Field, H2, Muted, Row, Screen, useLoad } from '../../src/ui';

const DEFAULT: DailyRoutine = { wake: '07:00', breakfast: '07:45', lunch: '13:00', dinner: '19:00', sleep: '23:00' };

export default function Me() {
  const user = useUser();
  const { signOut, setUser } = useAuth();
  const alerts = useLoad(() => api.notifications(), [user.id]);
  const team = useLoad(() => api.careTeam(user.id), [user.id]);
  const [email, setEmail] = useState('');
  const [routine, setRoutine] = useState<DailyRoutine>(user.routine ?? DEFAULT);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const share = async () => {
    setError('');
    try {
      await api.share(user.id, email.trim());
      setEmail('');
      team.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const unshare = (linkId: string, name: string) =>
    Alert.alert(`Remove ${name}?`, 'They will no longer see your doses or prescriptions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await api.unshare(user.id, linkId); team.reload(); } },
    ]);

  const saveRoutine = async () => {
    setError('');
    try {
      setUser(await api.updateMe({ routine }));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const unread = alerts.data?.filter((a) => !a.readAt) ?? [];

  return (
    <Screen onRefresh={() => { alerts.reload(); team.reload(); }} refreshing={alerts.loading}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Alerts</H2>
          {unread.length > 0 && (
            <Pressable onPress={async () => { await api.readAll(); alerts.reload(); }}>
              <Text style={{ color: colors.teal }}>Mark all read</Text>
            </Pressable>
          )}
        </Row>
        {alerts.data?.length === 0 && <Muted>No alerts.</Muted>}
        {alerts.data?.slice(0, 8).map((a) => (
          <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5), opacity: a.readAt ? 0.6 : 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{a.title}</Body>
              <Muted>{ago(a.createdAt)}</Muted>
            </Row>
            <Muted>{a.body}</Muted>
          </View>
        ))}
      </Card>

      <Card>
        <H2>Who can see my data</H2>
        <Muted>Your doctor, pharmacist or caregiver sees your record only after you add them here.</Muted>
        {team.data?.map((m) => (
          <Row key={m.linkId} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5), justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Body bold>{m.member.name}</Body>
              <Muted>{m.member.email}</Muted>
            </View>
            <Badge label={m.role} />
            <Pressable onPress={() => unshare(m.linkId, m.member.name)}><Text style={{ color: colors.bad, marginLeft: space(2) }}>Remove</Text></Pressable>
          </Row>
        ))}
        <Field label="Add by email" value={email} onChange={setEmail} keyboard="email-address" placeholder="doctor@clinic.com" />
        <Button kind="ghost" label="Give access" onPress={share} disabled={!email.includes('@')} />
      </Card>

      <Card>
        <H2>Daily routine</H2>
        <Muted>The AI uses these times to place each dose. 24-hour format, e.g. 07:30.</Muted>
        {(['wake', 'breakfast', 'lunch', 'dinner', 'sleep', 'training'] as const).map((k) => (
          <Field
            key={k}
            label={k === 'training' ? 'Training (optional)' : k[0].toUpperCase() + k.slice(1)}
            value={routine[k] ?? ''}
            keyboard="numbers-and-punctuation"
            onChange={(v) => { setSaved(false); setRoutine({ ...routine, [k]: v || undefined }); }}
          />
        ))}
        <Button label={saved ? 'Saved ✓' : 'Save routine'} onPress={saveRoutine} />
      </Card>

      <ErrorText message={error} />
      <Card>
        <Body bold>{user.name}</Body>
        <Muted>{user.email} · {user.segment ?? 'patient'}</Muted>
        <Button kind="ghost" label="Sign out" onPress={() => { signOut(); router.replace('/'); }} />
      </Card>
    </Screen>
  );
}
