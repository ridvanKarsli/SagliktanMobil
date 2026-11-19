import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, ErrorState, Loading, Screen, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import {
  getDiseaseGroup,
  getMyDiseaseGroups,
  joinDiseaseGroup,
  leaveDiseaseGroup,
  listSubGroups,
} from '@/api/endpoints';
import { useTheme } from '@/theme/ThemeContext';
import { formatCount } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';

export default function GroupScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const [busy, setBusy] = useState(false);

  const data = useAsync(async () => {
    const [group, subs, mine] = await Promise.all([
      getDiseaseGroup(groupId),
      listSubGroups(groupId),
      getMyDiseaseGroups(),
    ]);
    return { group, subs, member: mine.some((g) => g.id === groupId) };
  }, [groupId]);

  if (data.loading && !data.data) return <Loading />;
  if (!data.data) return <ErrorState message={data.error ?? 'Yüklenemedi.'} onRetry={data.reload} />;
  const { group, subs, member } = data.data;

  const toggleMembership = async () => {
    setBusy(true);
    try {
      if (member) await leaveDiseaseGroup(groupId);
      else await joinDiseaseGroup(groupId);
      await data.reload();
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () =>
    Alert.alert('Gruptan ayrıl', `${group.name} grubundan ayrılmak istiyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayrıl', style: 'destructive', onPress: toggleMembership },
    ]);

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} onRefresh={data.refresh} refreshing={data.refreshing}>
      <Stack.Screen options={{ title: group.name }} />
      <View style={{ gap: 12 }}>
        <Txt variant="h2">{group.name}</Txt>
        {group.description ? <Txt muted>{group.description}</Txt> : null}
        <Chip label={`${formatCount(group.memberCount)} üye`} icon="people-outline" />
        <Button
          title={member ? 'Gruptan ayrıl' : 'Gruba katıl'}
          variant={member ? 'outline' : 'primary'}
          onPress={member ? confirmLeave : toggleMembership}
          loading={busy}
        />
        <Txt variant="h3" style={{ marginTop: 8 }}>Konular</Txt>
        {subs.length === 0 ? (
          <Txt muted>Bu grupta henüz konu yok.</Txt>
        ) : (
          subs.map((s) => (
            <Card
              key={s.id}
              onPress={() => router.push({ pathname: '/sub-groups/[id]', params: { id: String(s.id) } })}
              style={{ gap: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt variant="h3" style={{ flex: 1 }}>{s.name}</Txt>
                <Ionicons name="chevron-forward" size={20} color={t.inkMuted} />
              </View>
              {s.description ? <Txt variant="small" muted numberOfLines={2}>{s.description}</Txt> : null}
              <Txt variant="caption" muted>{formatCount(s.postCount)} paylaşım</Txt>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
