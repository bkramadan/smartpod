/**
 * My Smart Pod: connection, battery and pill levels.
 * "Pair a Pod" creates a simulated Pod and shows the id and key to put into the
 * Pod simulator (or, later, into a real Pod during setup).
 */
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { api } from '../../src/api';
import { useUser } from '../../src/auth';
import { ago, colors, space } from '../../src/theme';
import { Badge, Body, Button, Card, ErrorText, H2, Muted, Row, Screen, useLoad } from '../../src/ui';

export default function Pod() {
  const user = useUser();
  const devices = useLoad(() => api.devices(user.id), [user.id]);
  const stock = useLoad(() => api.inventory(user.id), [user.id]);
  const [error, setError] = useState('');

  const pods = devices.data?.filter((d) => d.type !== 'phone') ?? [];

  const pair = async () => {
    try {
      const pod = await api.pairPod(user.id, 'My Smart Pod');
      Alert.alert('Pod paired', `Device id: ${pod.id}\nDevice key: ${pod.deviceKey}\n\nPut these in the Pod simulator (pod-simulator/.env). The key is shown only once.`);
      devices.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen onRefresh={() => { devices.reload(); stock.reload(); }} refreshing={devices.loading}>
      <ErrorText message={devices.error ?? error} />
      {pods.length === 0 && (
        <Card>
          <H2>No Pod yet</H2>
          <Muted>Your phone works on its own: it reminds you and you tap "Taken". A Pod releases each dose and confirms it by itself.</Muted>
          <Button label="Pair a Pod" onPress={pair} />
        </Card>
      )}
      {pods.map((d) => (
        <Card key={d.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>{d.name}</H2>
            <Badge label={d.online ? 'Online' : 'Offline'} tone={d.online ? 'good' : 'warn'} />
          </Row>
          <Row style={{ gap: space(6) }}>
            <View><Muted>Battery</Muted><Body bold>{d.battery ?? '–'}%</Body></View>
            <View><Muted>Last seen</Muted><Body bold>{d.lastSeenAt ? ago(d.lastSeenAt) : 'never'}</Body></View>
            <View><Muted>Firmware</Muted><Body bold>{d.firmware ?? '–'}</Body></View>
          </Row>
          {d.type === 'simulated-pod' && <Muted>Simulated Pod for the prototype. Run it from the pod-simulator folder.</Muted>}
        </Card>
      ))}

      <Card>
        <H2>Pill levels</H2>
        {stock.data?.map((s) => (
          <View key={s.itemId} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5), gap: space(1.5) }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{s.itemName}</Body>
              {s.low ? <Badge label="Refill soon" tone="warn" /> : <Text style={{ color: colors.muted }}>{s.daysLeft} days left</Text>}
            </Row>
            <View style={{ height: 8, backgroundColor: colors.mint, borderRadius: 99, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (s.count / 60) * 100)}%`, height: '100%', backgroundColor: s.low ? '#D08A2C' : colors.teal }} />
            </View>
            <Muted>{s.count} left · {s.perDay} a day</Muted>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
