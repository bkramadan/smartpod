/** Everyone who shared access with me. */
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api';
import { colors, space, time } from '../../src/theme';
import { Badge, Body, Card, ErrorText, Muted, Row, Screen, useLoad } from '../../src/ui';

export default function Patients() {
  const list = useLoad(() => api.patients());
  return (
    <Screen onRefresh={list.reload} refreshing={list.loading}>
      <ErrorText message={list.error} />
      {list.data?.length === 0 && (
        <Card><Muted>No one has shared access with you yet. A patient adds you by email from their app.</Muted></Card>
      )}
      {list.data?.map((s) => (
        <Pressable key={s.patient.id} onPress={() => router.push(`/(care)/patient/${s.patient.id}`)}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{s.patient.name}</Body>
              <Text style={{ fontWeight: '700', color: s.adherence7 >= 90 ? colors.good : s.adherence7 >= 75 ? colors.warn : colors.bad }}>
                {s.adherence7}%
              </Text>
            </Row>
            <Row style={{ flexWrap: 'wrap' }}>
              {s.missedToday > 0 && <Badge label={`${s.missedToday} missed today`} tone="bad" />}
              {s.lowStock > 0 && <Badge label={`${s.lowStock} low stock`} tone="warn" />}
              {s.missedToday === 0 && s.lowStock === 0 && <Badge label="On track" tone="good" />}
            </Row>
            <View style={{ gap: space(0.5) }}>
              <Muted>{s.nextDose ? `Next: ${time(s.nextDose.plannedAt)} · ${s.nextDose.itemName}` : 'Done for today'}</Muted>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
