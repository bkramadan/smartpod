/** Building blocks shared by every mobile screen. */
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { AiReport, DoseStatus, Severity } from '@smartpod/shared';
import { colors, space } from './theme';

/** Load data when the screen opens or comes back into view. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return { data, error, loading, reload };
}

export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), paddingBottom: space(12), gap: space(3) }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const Title = ({ children }: { children: ReactNode }) => <Text style={s.title}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;
export const Body = ({ children, bold }: { children: ReactNode; bold?: boolean }) => (
  <Text style={[s.body, bold && { fontWeight: '700' }]}>{children}</Text>
);

export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(2) }, style]}>{children}</View>
);

export function Button({ label, onPress, kind = 'primary', small, disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; small?: boolean; disabled?: boolean;
}) {
  const bg = kind === 'primary' ? colors.teal : kind === 'danger' ? colors.bad : 'transparent';
  const fg = kind === 'ghost' ? colors.teal : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.line },
        small && { paddingVertical: space(1.5), paddingHorizontal: space(3) },
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';
const toneColors: Record<Tone, [string, string]> = {
  good: [colors.goodBg, colors.good],
  warn: [colors.warnBg, colors.warn],
  bad: [colors.badBg, colors.bad],
  neutral: ['#E7ECEC', colors.ink2],
};
export const Badge = ({ label, tone = 'neutral' }: { label: string; tone?: Tone }) => (
  <View style={[s.badge, { backgroundColor: toneColors[tone][0] }]}>
    <Text style={{ color: toneColors[tone][1], fontSize: 12, fontWeight: '700' }}>{label}</Text>
  </View>
);

const statusTone: Record<DoseStatus, Tone> = { due: 'neutral', taken: 'good', missed: 'bad', skipped: 'warn' };
const statusLabel: Record<DoseStatus, string> = { due: 'Due', taken: 'Taken', missed: 'Missed', skipped: 'Skipped' };
export const StatusBadge = ({ status }: { status: DoseStatus }) => <Badge label={statusLabel[status]} tone={statusTone[status]} />;

const sevTone: Record<Severity, Tone> = { serious: 'bad', moderate: 'warn', minor: 'neutral' };
export const SeverityBadge = ({ severity }: { severity: Severity }) => (
  <Badge label={severity[0].toUpperCase() + severity.slice(1)} tone={sevTone[severity]} />
);

export const ErrorText = ({ message }: { message?: string }) =>
  message ? (
    <View style={s.error}>
      <Text style={{ color: colors.bad }}>{message}</Text>
    </View>
  ) : null;

export const Loading = () => <ActivityIndicator color={colors.teal} style={{ marginVertical: space(6) }} />;

/** Conflicts, timing and food guidance from the AI engine. */
export function ReportView({ report, compact }: { report: AiReport; compact?: boolean }) {
  return (
    <View style={{ gap: space(3) }}>
      <View style={s.explain}>
        <Text style={s.tag}>{report.explainedBy === 'claude' ? 'EXPLAINED BY CLAUDE' : 'AI SUMMARY'}</Text>
        <Body>{report.explanation}</Body>
      </View>
      {report.conflicts.map((c) => (
        <View key={`${c.a}-${c.b}`} style={[s.conflict, { borderLeftColor: c.severity === 'serious' ? colors.bad : c.severity === 'moderate' ? '#D08A2C' : colors.line }]}>
          <Row>
            <SeverityBadge severity={c.severity} />
            <Text style={{ fontWeight: '700', flex: 1, color: colors.ink }}>{c.aName} + {c.bName}</Text>
          </Row>
          <Body>{c.reason}</Body>
          <Muted>What to do: {c.advice}</Muted>
        </View>
      ))}
      {!compact && report.timing.length > 0 && (
        <View style={{ gap: space(2) }}>
          <H2>Best times</H2>
          {report.timing.map((t) => (
            <View key={t.itemId} style={s.timing}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body bold>{t.name}</Body>
                <Text style={s.timePill}>{t.suggestedTimes.join(' · ')}</Text>
              </Row>
              <Muted>{t.why}</Muted>
            </View>
          ))}
        </View>
      )}
      {compact && report.timing[0] && <Muted>Suggested time: {report.timing[0].suggestedTimes.join(', ')}. {report.timing[0].why}</Muted>}
      {!compact && report.food.length > 0 && (
        <View style={{ gap: space(1.5) }}>
          <H2>Food guidance</H2>
          {report.food.map((f) => <Body key={f.catalogId}>• {f.name}: {f.tip}</Body>)}
        </View>
      )}
      <Text style={s.disclaimer}>{report.disclaimer}</Text>
    </View>
  );
}

/** A labelled text box. */
export function Field({ label, value, onChange, keyboard, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; keyboard?: 'email-address' | 'numbers-and-punctuation'; placeholder?: string;
}) {
  return (
    <View style={{ gap: space(1) }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink2 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboard}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
        style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: space(3), backgroundColor: colors.white, fontSize: 16, color: colors.ink }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: space(2) },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  h2: { fontSize: 17, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  button: { borderRadius: 10, paddingVertical: space(3), paddingHorizontal: space(4), alignItems: 'center' },
  badge: { paddingHorizontal: space(2.5), paddingVertical: space(0.5), borderRadius: 99, alignSelf: 'flex-start' },
  error: { backgroundColor: colors.badBg, borderRadius: 10, padding: space(3) },
  explain: { backgroundColor: colors.tealSoft, borderRadius: 12, padding: space(3), gap: space(1) },
  tag: { fontSize: 11, fontWeight: '800', color: colors.teal, letterSpacing: 0.8 },
  conflict: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, padding: space(3), gap: space(1.5) },
  timing: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: space(3), gap: space(1) },
  timePill: { backgroundColor: colors.mint, color: colors.ink, fontWeight: '700', paddingHorizontal: space(2.5), paddingVertical: space(1), borderRadius: 99, overflow: 'hidden' },
  disclaimer: { fontSize: 12, color: colors.muted, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2) },
});
