import { useState } from 'react';
import { Alert, View } from 'react-native';
import AdminGuard from '@/components/AdminGuard';
import { Banner, Button, Card, ErrorState, Loading, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { createDiseaseGroup, createSubGroup, deleteDiseaseGroup, deleteSubGroup, listDiseaseGroups, listSubGroups } from '@/api/endpoints';
import type { DiseaseGroup, SubGroup } from '@/api/types';
import { useAsync } from '@/utils/useAsync';

function GroupCard({ group, onChanged }: { group: DiseaseGroup; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<SubGroup[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    try {
      setSubs(await listSubGroups(group.id));
      setOpen(true);
    } catch (err) {
      Alert.alert('Yüklenemedi', errorMessage(err));
    }
  };

  const addSub = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createSubGroup(group.id, name.trim(), null);
      setName('');
      setSubs(await listSubGroups(group.id));
    } catch (err) {
      Alert.alert('Eklenemedi', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, run: () => Promise<unknown>, after: () => void) =>
    Alert.alert(title, 'İçindeki gönderiler de silinebilir. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await run();
            after();
          } catch (err) {
            Alert.alert('Silinemedi', errorMessage(err));
          }
        },
      },
    ]);

  return (
    <Card style={{ gap: 10 }}>
      <Txt variant="h3">{group.name}</Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={open ? 'Konuları gizle' : 'Konular'} variant="outline" style={{ flex: 1 }} onPress={toggle} />
        <Button title="Sil" variant="danger" style={{ flex: 1 }} onPress={() => confirm(`${group.name} silinsin mi?`, () => deleteDiseaseGroup(group.id), onChanged)} />
      </View>
      {open && subs && (
        <View style={{ gap: 8 }}>
          {subs.length === 0 && <Txt variant="small" muted>Konu yok.</Txt>}
          {subs.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt variant="small" style={{ flex: 1 }}>{s.name}</Txt>
              <Button title="Sil" variant="ghost" onPress={() => confirm(`${s.name} silinsin mi?`, () => deleteSubGroup(s.id), () => setSubs((prev) => prev?.filter((x) => x.id !== s.id) ?? null))} />
            </View>
          ))}
          <TextField label="Yeni konu" value={name} onChangeText={setName} />
          <Button title="Konu ekle" onPress={addSub} loading={busy} />
        </View>
      )}
    </Card>
  );
}

function Groups() {
  const groups = useAsync((signal) => listDiseaseGroups(undefined, signal), []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) {
      setError('Grup adı yaz.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDiseaseGroup(name.trim(), description.trim() || null);
      setName('');
      setDescription('');
      await groups.reload();
    } catch (err) {
      setError(errorMessage(err, 'Grup eklenemedi.'));
    } finally {
      setBusy(false);
    }
  };

  if (groups.loading && !groups.data) return <Loading />;
  if (!groups.data) return <ErrorState message={groups.error ?? 'Yüklenemedi.'} onRetry={groups.reload} />;

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']} onRefresh={groups.refresh} refreshing={groups.refreshing}>
      <View style={{ gap: 12, paddingBottom: 24 }}>
        <Card style={{ gap: 10 }}>
          <Txt variant="h3">Yeni hastalık grubu</Txt>
          {error && <Banner tone="error" text={error} />}
          <TextField label="Ad" value={name} onChangeText={setName} />
          <TextField label="Açıklama" value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
          <Button title="Grup ekle" onPress={add} loading={busy} />
        </Card>
        {groups.data.map((g) => (
          <GroupCard key={g.id} group={g} onChanged={groups.reload} />
        ))}
      </View>
    </Screen>
  );
}

export default function AdminGroups() {
  return (
    <AdminGuard>
      <Groups />
    </AdminGuard>
  );
}
