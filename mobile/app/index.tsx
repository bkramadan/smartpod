/** Welcome screen: create a profile, or sign in with a demo account. */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DemoAccount } from '@smartpod/shared';
import { api, API_URL } from '../src/api';
import { homeFor, useAuth } from '../src/auth';
import { colors, space } from '../src/theme';
import { Badge, Button, Card, ErrorText, H2, Muted, Screen, useLoad } from '../src/ui';

const roleText: Record<string, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  caregiver: 'Caregiver',
};

export default function Welcome() {
  const { user, signIn } = useAuth();
  const accounts = useLoad(() => api.accounts());
  const [error, setError] = useState('');

  if (user) return <Redirect href={homeFor(user.role)} />;

  const pick = async (a: DemoAccount) => {
    try {
      const res = await api.login(a.id);
      signIn(res.token, res.user);
      router.replace(homeFor(res.user.role));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen onRefresh={accounts.reload} refreshing={accounts.loading}>
        <View style={{ paddingVertical: space(6), gap: space(2) }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.teal, letterSpacing: 1 }}>◉ SMART POD</Text>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.ink }}>Your medicines and supplements, on time.</Text>
          <Muted>Reminders, conflict warnings and the best time for each dose, shared with the people who care for you.</Muted>
        </View>

        <Button label="Create my profile" onPress={() => router.push('/register')} />

        <Card>
          <H2>Or try a demo account</H2>
          <Muted>Demo data, fictional people.</Muted>
          <ErrorText message={accounts.error ?? error} />
          {accounts.error && <Muted>Backend address: {API_URL}</Muted>}
          {accounts.data?.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => pick(a)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3),
                borderTopWidth: 1, borderTopColor: colors.line, opacity: pressed ? 0.6 : 1,
              })}
            >
              <Badge label={roleText[a.role]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{a.name}</Text>
                {a.segment === 'athlete' && <Muted>Athlete · supplements</Muted>}
              </View>
              <Text style={{ color: colors.teal, fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
        </Card>
      </Screen>
    </SafeAreaView>
  );
}
