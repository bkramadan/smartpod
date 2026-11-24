import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useBackendStatus, type BackendStatus } from './useBackendStatus';

const STATUS_TEXT: Record<BackendStatus, string> = {
  checking: 'Checking backend…',
  online: 'Backend: online',
  offline: 'Backend: offline. Is it running?',
};

/** Root screen of the mobile app. */
export function App() {
  const status = useBackendStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Pod</Text>
      <Text>{STATUS_TEXT[status]}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
