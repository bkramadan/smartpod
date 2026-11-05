/** Tabs for doctors, pharmacists and caregivers. */
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/auth';
import { colors } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function CareTabs() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/" />;
  if (user.role === 'patient') return <Redirect href="/(patient)/today" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="patients" options={{ title: user.role === 'caregiver' ? 'People I care for' : 'Patients', tabBarLabel: 'Patients', tabBarIcon: icon('☷') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('!') }} />
      <Tabs.Screen name="profile" options={{ title: "Me", tabBarIcon: icon("☰") }} />
      <Tabs.Screen name="patient/[id]" options={{ href: null, title: 'Patient' }} />
    </Tabs>
  );
}
