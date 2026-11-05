/**
 * Onboarding: everyone creates a profile here and picks a role:
 * patient (medication, athlete or wellness), doctor, pharmacist or caregiver.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PatientSegment, Role } from '@smartpod/shared';
import { api } from '../src/api';
import { homeFor, useAuth } from '../src/auth';
import { colors, space } from '../src/theme';
import { Button, Card, ErrorText, Field, H2, Muted, Screen, Title } from '../src/ui';

const roles: { role: Role; title: string; help: string }[] = [
  { role: 'patient', title: 'I take medicines or supplements', help: 'Reminders, Pod, conflict warnings' },
  { role: 'caregiver', title: 'I care for someone', help: 'Follow their doses, get alerts' },
  { role: 'doctor', title: 'I am a doctor', help: 'Monitor patients, manage prescriptions' },
  { role: 'pharmacist', title: 'I am a pharmacist', help: 'See prescriptions, usage and stock' },
];

const segments: { value: PatientSegment; label: string }[] = [
  { value: 'medication', label: 'Medication' },
  { value: 'athlete', label: 'Athlete' },
  { value: 'wellness', label: 'Wellness' },
];

export default function Register() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('patient');
  const [segment, setSegment] = useState<PatientSegment>('medication');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [licence, setLicence] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.register({
        name, email, role,
        segment: role === 'patient' ? segment : undefined,
        licenceNumber: role === 'doctor' ? licence : undefined,
      });
      signIn(res.token, res.user);
      router.replace(homeFor(res.user.role));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.teal }}>‹ Back</Text></Pressable>
        <Title>Create your profile</Title>

        <Card>
          <H2>Who are you?</H2>
          {roles.map((r) => {
            const on = r.role === role;
            return (
              <Pressable
                key={r.role}
                onPress={() => setRole(r.role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{
                  borderWidth: on ? 2 : 1, borderColor: on ? colors.teal : colors.line, backgroundColor: on ? colors.mint : colors.white,
                  borderRadius: 12, padding: space(3), gap: space(0.5),
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.ink }}>{r.title}</Text>
                <Muted>{r.help}</Muted>
              </Pressable>
            );
          })}

          {role === 'patient' && (
            <View style={{ gap: space(2), marginTop: space(2) }}>
              <Muted>What do you mainly use Smart Pod for?</Muted>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                {segments.map((sg) => (
                  <Pressable
                    key={sg.value}
                    onPress={() => setSegment(sg.value)}
                    style={{
                      flex: 1, paddingVertical: space(2), borderRadius: 99, alignItems: 'center',
                      backgroundColor: segment === sg.value ? colors.teal : colors.white,
                      borderWidth: 1, borderColor: segment === sg.value ? colors.teal : colors.line,
                    }}
                  >
                    <Text style={{ color: segment === sg.value ? colors.white : colors.ink, fontWeight: '600' }}>{sg.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Card>

        <Card>
          <H2>Your details</H2>
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" />
          {role === 'doctor' && <Field label="Medical licence number" value={licence} onChange={setLicence} />}
          {role === 'doctor' && <Muted>Licences are verified before real patients can share with you.</Muted>}
        </Card>

        <ErrorText message={error} />
        <Button label={busy ? 'Creating…' : 'Create profile'} onPress={submit} disabled={busy || !name || !email} />
      </Screen>
    </SafeAreaView>
  );
}
