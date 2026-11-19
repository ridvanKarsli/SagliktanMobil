import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import AdminGuard from '@/components/AdminGuard';
import { Button, Card, Chip, EmptyState, ErrorState, Loading, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { listAdminReports, resolveAdminReport } from '@/api/endpoints';
import type { AdminReport, ReportStatus } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';

const TARGET: Record<AdminReport['targetType'], string> = { POST: 'Gönderi', COMMENT: 'Yorum', MESSAGE: 'Mesaj', USER: 'Kullanıcı' };
const FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'REVIEWED', label: 'İncelenen' },
  { value: 'REJECTED', label: 'Reddedilen' },
];

function Reports() {
  const listContent = useListContent(12);
  const t = useTheme();
  const [status, setStatus] = useState<ReportStatus>('PENDING');
  const list = usePagedList((page, signal) => listAdminReports({ status, page, signal }), [status]);

  const resolve = async (r: AdminReport, next: ReportStatus, deleteContent: boolean) => {
    try {
      const res = await resolveAdminReport(r.id, next, deleteContent);
      list.setItems((prev) => prev.filter((x) => x.id !== r.id));
      Alert.alert('Tamam', res.message);
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  const act = (r: AdminReport) => {
    const canDelete = r.targetType === 'POST' || r.targetType === 'COMMENT';
    Alert.alert('Şikayeti sonuçlandır', r.targetPreview ?? undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Reddet', onPress: () => resolve(r, 'REJECTED', false) },
      { text: 'İncelendi', onPress: () => resolve(r, 'REVIEWED', false) },
      ...(canDelete ? [{ text: 'İçeriği sil', style: 'destructive' as const, onPress: () => resolve(r, 'REVIEWED', true) }] : []),
    ]);
  };

  const header = (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      {FILTERS.map((f) => {
        const selected = status === f.value;
        return (
          <Pressable
            key={f.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setStatus(f.value)}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: selected ? t.primary : t.surface, borderWidth: 1, borderColor: selected ? t.primary : t.borderStrong }}
          >
            <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>{f.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );

  if (list.loading && list.items.length === 0) return <Loading />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={header}
      contentContainerStyle={listContent}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : <EmptyState icon="checkmark-done-outline" title="Şikayet yok" />}
      renderItem={({ item }) => (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Chip label={TARGET[item.targetType]} tone="rose" />
            <Txt variant="caption" muted style={{ flex: 1 }}>{relativeTime(item.createdAt)}</Txt>
          </View>
          {item.targetPreview ? <Txt variant="small" numberOfLines={4}>{item.targetPreview}</Txt> : null}
          <Txt variant="caption" muted>
            Sahibi: {item.targetOwnerName ?? '-'} · Şikayet eden: {item.reporterName}
          </Txt>
          {item.reason ? <Txt variant="caption" muted>Sebep: {item.reason}</Txt> : null}
          {item.status === 'PENDING' ? (
            <View style={{ gap: 8 }}>
              <Button title="Sonuçlandır" onPress={() => act(item)} />
              {item.targetType === 'POST' && (
                <Button title="Gönderiyi aç" variant="ghost" onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(item.targetId) } })} />
              )}
            </View>
          ) : (
            <Txt variant="caption" muted>
              {item.status === 'REVIEWED' ? 'İncelendi' : 'Reddedildi'}
              {item.resolvedByName ? ` · ${item.resolvedByName}` : ''}
            </Txt>
          )}
        </Card>
      )}
    />
  );
}

export default function AdminReports() {
  return (
    <AdminGuard>
      <Reports />
    </AdminGuard>
  );
}
