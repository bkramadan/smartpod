/**
 * Root of the app. expo-router turns every file in app/ into a screen:
 *   app/index.tsx          welcome + sign in
 *   app/register.tsx       create a profile and pick a role
 *   app/(patient)/...      tabs for patients and athletes
 *   app/(care)/...         tabs for doctors, pharmacists and caregivers
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
