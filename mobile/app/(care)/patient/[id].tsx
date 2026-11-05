/**
 * One patient, seen by a doctor, pharmacist or caregiver.
 * Caregivers can mark a dose taken for the person they care for.
 * Doctors change prescriptions on the web dashboard (bigger screen, more checks).
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api';
import { useUser } from '../../../src/auth';
import { colors, space, time } from '../../../src/theme';
import { Badge, Body, Button, Card, ErrorText, H2, Muted, ReportView, Row, Screen, StatusBadge, Title, useLoad } from '../../../src/ui';

export default function PatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const summary = useLoad(() => api.patient(id), [id]);
  const doses = useLoad(() => api.doses(id), [id]);
  const items = useLoad(() => api.items(id), [id]);
  const stock = useLoad(() => (user.role === 'pharmacist' ? api.inventory(id) : Promise.resolve([])), [id]);
  const report = useLoad(() => (user.role === 'caregiver' ? Promise.resolve(undefined) : api.report(id)), [id]);
  const [error, setError] = useState('');

  const take = async (doseId: string) => {
    try {
      await api.take(doseId);
      doses.reload();
      summary.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen onRefresh={() => { summary.reload(); doses.reload(); }} refreshing={summary.loading}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.teal }}>‹ All patients</Text></Pressable>
      <ErrorText message={summary.error ?? error} />
      {summary.data && (
        <View style={{ gap: space(1) }}>
          <Title>{summary.data.patient.name}</Title>
          <Muted>{summary.data.adherence7}% adherence in the last 7 days · {summary.data.missedToday} missed today</Muted>
        </View>
      )}

      <Card>
        <H2>Today</H2>
        {doses.data?.map((d) => (
          <Row key={d.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5) }}>
            <Text style={{ width: 48, fontWeight: '700', color: colors.ink }}>{time(d.plannedAt)}</Text>
            <View style={{ flex: 1 }}>
              <Body bold>{d.itemName}</Body>
              <Muted>{d.itemDose}</Muted>
            </View>
            <StatusBadge status={d.status} />
            {user.role === 'caregiver' && (d.status === 'due' || d.status === 'missed') &&
              new Date(d.plannedAt).getTime() - Date.now() <= 2 * 3600000 && (
                <Button small label="Taken" onPress={() => take(d.id)} />
              )}
          </Row>
        ))}
      </Card>

      {user.role !== 'caregiver' && (
        <Card>
          <H2>Prescriptions and supplements</H2>
          {items.data?.map((i) => (
            <Row key={i.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5), justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Body bold>{i.name} <Text style={{ fontWeight: '400' }}>{i.dose}</Text></Body>
                <Muted>{i.kind === 'medicine' ? 'Prescription' : 'Supplement'} · {i.times.join(', ')}</Muted>
              </View>
            </Row>
          ))}
          {user.role === 'doctor' && <Muted>To add or change a prescription, use the web dashboard.</Muted>}
        </Card>
      )}

      {user.role === 'pharmacist' && (
        <Card>
          <H2>Pill levels</H2>
          {stock.data?.map((s) => (
            <Row key={s.itemId} style={{ justifyContent: 'space-between' }}>
              <Body>{s.itemName}</Body>
              <Row>
                <Muted>{s.count} left</Muted>
                {s.low && <Badge label="Refill" tone="warn" />}
              </Row>
            </Row>
          ))}
        </Card>
      )}

      {report.data && (
        <Card>
          <H2>AI report</H2>
          <ReportView report={report.data} compact />
        </Card>
      )}
    </Screen>
  );
}
