/** Tabs for patients and athletes. */
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/auth';
import { colors } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function PatientTabs() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/" />;
  if (user.role !== 'patient') return <Redirect href="/(care)/patients" />;

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
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: icon('◷') }} />
      <Tabs.Screen name="items" options={{ title: 'My items', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="insights" options={{ title: 'AI insights', tabBarIcon: icon('✦') }} />
      <Tabs.Screen name="pod" options={{ title: 'Pod', tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('☰') }} />
    </Tabs>
  );
}
