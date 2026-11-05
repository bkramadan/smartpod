/** Alerts for clinicians and caregivers: missed doses, conflicts, refills, Pod problems. */
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api';
import { ago, colors, space } from '../../src/theme';
import { Body, Card, ErrorText, Muted, Row, Screen, useLoad } from '../../src/ui';

export default function Alerts() {
  const alerts = useLoad(() => api.notifications());
  const unread = alerts.data?.some((a) => !a.readAt);
  return (
    <Screen onRefresh={alerts.reload} refreshing={alerts.loading}>
      <ErrorText message={alerts.error} />
      {unread && (
        <Pressable onPress={async () => { await api.readAll(); alerts.reload(); }}>
          <Text style={{ color: colors.teal, textAlign: 'right' }}>Mark all read</Text>
        </Pressable>
      )}
      {alerts.data?.length === 0 && <Card><Muted>No alerts.</Muted></Card>}
      {alerts.data?.map((a) => (
        <Pressable key={a.id} onPress={() => a.patientId && router.push(`/(care)/patient/${a.patientId}`)}>
          <Card style={{ opacity: a.readAt ? 0.65 : 1, borderLeftWidth: 4, borderLeftColor: a.kind === 'missed-dose' || a.kind === 'conflict-warning' ? colors.bad : colors.teal }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><Body bold>{a.title}</Body></View>
              <Muted>{ago(a.createdAt)}</Muted>
            </Row>
            <Muted>{a.body}</Muted>
          </Card>
        </Pressable>
      ))}
      <View style={{ height: space(4) }} />
    </Screen>
  );
}
