/**
 * What I take. Medicines come from the doctor; supplements I can add myself.
 * Before adding, the AI engine checks the supplement against everything else.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { AiReport, CatalogItem } from '@smartpod/shared';
import { api, ApiError } from '../../src/api';
import { useUser } from '../../src/auth';
import { colors, space } from '../../src/theme';
import { Badge, Body, Button, Card, ErrorText, H2, Muted, ReportView, Row, Screen, useLoad } from '../../src/ui';

export default function Items() {
  const user = useUser();
  const items = useLoad(() => api.items(user.id), [user.id]);
  const catalog = useLoad(() => api.catalog());
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<CatalogItem>();
  const [report, setReport] = useState<AiReport>();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');

  const medicines = items.data?.filter((i) => i.kind === 'medicine') ?? [];
  const supplements = items.data?.filter((i) => i.kind === 'supplement') ?? [];
  const already = new Set(items.data?.map((i) => i.catalogId));
  const choices = catalog.data?.items.filter((c) => c.kind === 'supplement' && !already.has(c.id)) ?? [];

  const pick = async (c: CatalogItem) => {
    setPicked(c);
    setReport(undefined);
    setBlocked(false);
    setError('');
    try {
      const r = await api.check(user.id, { catalogId: c.id });
      setReport(r);
      setBlocked(r.conflicts.some((x) => x.severity === 'serious'));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const add = async () => {
    if (!picked) return;
    try {
      await api.addItem(user.id, { catalogId: picked.id });
      setAdding(false);
      setPicked(undefined);
      setReport(undefined);
      items.reload();
    } catch (e) {
      if (e instanceof ApiError && e.body?.report) {
        setReport(e.body.report);
        setBlocked(true);
      }
      setError((e as Error).message);
    }
  };

  const stop = (id: string, name: string) =>
    Alert.alert(`Stop ${name}?`, 'Future reminders for it will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => { await api.stopItem(user.id, id); items.reload(); } },
    ]);

  return (
    <Screen onRefresh={items.reload} refreshing={items.loading}>
      <ErrorText message={items.error} />
      <Card>
        <H2>Prescribed by my doctor</H2>
        {medicines.length === 0 && <Muted>No prescriptions.</Muted>}
        {medicines.map((i) => (
          <View key={i.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5), gap: space(0.5) }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{i.name} <Text style={{ fontWeight: '400' }}>{i.dose}</Text></Body>
              <Badge label={i.times.join(' · ')} />
            </Row>
            {i.instructions ? <Muted>{i.instructions}</Muted> : null}
          </View>
        ))}
        <Muted>Only your doctor can change prescriptions.</Muted>
      </Card>

      <Card>
        <H2>My supplements</H2>
        {supplements.length === 0 && <Muted>None yet.</Muted>}
        {supplements.map((i) => (
          <View key={i.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space(2.5) }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body bold>{i.name} <Text style={{ fontWeight: '400' }}>{i.dose}</Text></Body>
              <Row>
                <Badge label={i.times.join(' · ')} />
                {i.createdBy === user.id && (
                  <Pressable onPress={() => stop(i.id, i.name)}><Text style={{ color: colors.bad }}>Stop</Text></Pressable>
                )}
              </Row>
            </Row>
          </View>
        ))}
        {!adding && <Button kind="ghost" label="+ Add a supplement" onPress={() => setAdding(true)} />}
      </Card>

      {adding && (
        <Card>
          <H2>Add a supplement</H2>
          <Muted>Pick one. The AI checks it against everything you take and suggests the best time.</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {choices.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => pick(c)}
                style={{
                  paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: 99, borderWidth: 1,
                  borderColor: picked?.id === c.id ? colors.teal : colors.line,
                  backgroundColor: picked?.id === c.id ? colors.teal : colors.white,
                }}
              >
                <Text style={{ color: picked?.id === c.id ? colors.white : colors.ink, fontWeight: '600' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          {report && <ReportView report={report} compact />}
          <ErrorText message={error} />
          {blocked && <Muted>Serious conflict: ask your doctor before adding this. They can add it from their dashboard.</Muted>}
          <Row>
            <Button label="Add" onPress={add} disabled={!picked || !report || blocked} />
            <Button kind="ghost" label="Cancel" onPress={() => { setAdding(false); setPicked(undefined); setReport(undefined); }} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}
