/** Today's doses. Tap "Taken" when you take one (the Pod confirms by itself). */
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../src/api';
import { useUser } from '../../src/auth';
import { colors, space, time } from '../../src/theme';
import { Badge, Body, Button, Card, ErrorText, H2, Loading, Muted, Row, Screen, StatusBadge, useLoad } from '../../src/ui';

const EARLY_HOURS = 2;

export default function Today() {
  const user = useUser();
  const doses = useLoad(() => api.doses(user.id), [user.id]);
  const adherence = useLoad(() => api.adherence(user.id, 7), [user.id]);
  const [error, setError] = useState('');

  const act = async (id: string, action: 'take' | 'skip') => {
    setError('');
    try {
      await (action === 'take' ? api.take(id) : api.skip(id));
      doses.reload();
      adherence.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const list = doses.data ?? [];
  const done = list.filter((d) => d.status === 'taken').length;
  const next = list.find((d) => d.status === 'due');
  const hello = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen onRefresh={doses.reload} refreshing={doses.loading}>
      <View style={{ gap: space(1) }}>
        <Muted>{hello}, {user.name.split(' ')[0]}</Muted>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.ink }}>
          {list.length ? `${done} of ${list.length} done today` : 'Nothing planned today'}
        </Text>
      </View>

      {next && (
        <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}>
          <Text style={{ color: '#7CC7B8', fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>NEXT</Text>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{time(next.plannedAt)} · {next.itemName}</Text>
          <Text style={{ color: '#BFD3D0' }}>{next.itemDose}{next.instructions ? ` · ${next.instructions}` : ''}</Text>
        </Card>
      )}

      <ErrorText message={doses.error ?? error} />
      {doses.loading && !doses.data && <Loading />}

      <Card>
        <H2>Schedule</H2>
        {list.map((d) => {
          const canAct = (d.status === 'due' || d.status === 'missed') &&
            new Date(d.plannedAt).getTime() - Date.now() <= EARLY_HOURS * 3600000;
          return (
            <View key={d.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(3), gap: space(2) }}>
              <Row>
                <Text style={{ width: 52, fontWeight: '700', color: d.status === 'missed' ? colors.bad : colors.ink }}>{time(d.plannedAt)}</Text>
                <View style={{ flex: 1 }}>
                  <Body bold>{d.itemName} <Text style={{ fontWeight: '400' }}>{d.itemDose}</Text></Body>
                  {d.instructions ? <Muted>{d.instructions}</Muted> : null}
                </View>
                <StatusBadge status={d.status} />
              </Row>
              {d.status === 'taken' && d.confirmedBy === 'pod' && <Badge label="Confirmed by Pod" tone="good" />}
              {canAct && (
                <Row style={{ paddingLeft: 52 }}>
                  <Button small label="Taken" onPress={() => act(d.id, 'take')} />
                  <Button small kind="ghost" label="Skip" onPress={() => act(d.id, 'skip')} />
                </Row>
              )}
            </View>
          );
        })}
      </Card>

      {adherence.data && (
        <Card>
          <H2>This week</H2>
          <Row style={{ alignItems: 'flex-end', height: 90, gap: space(1.5) }}>
            {adherence.data.daily.map((day) => (
              <View key={day.day} style={{ flex: 1, alignItems: 'center', gap: space(1) }}>
                <View style={{ width: '70%', height: 60, justifyContent: 'flex-end', backgroundColor: colors.mint, borderRadius: 6, overflow: 'hidden' }}>
                  <View style={{ height: `${day.planned ? (day.taken / day.planned) * 100 : 0}%`, backgroundColor: colors.teal }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(`${day.day}T12:00:00`).toLocaleDateString([], { weekday: 'narrow' })}</Text>
              </View>
            ))}
          </Row>
          <Muted>{adherence.data.percent}% of doses taken in the last 7 days.</Muted>
        </Card>
      )}
    </Screen>
  );
}
