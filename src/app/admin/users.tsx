import { useEffect, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import AdminGuard from '@/components/AdminGuard';
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Loading, TextField, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { listAdminUsers, updateAdminUser } from '@/api/endpoints';
import type { AdminUser } from '@/api/types';
import { fullNameOf } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';

function Users() {
  const listContent = useListContent(12);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);
  const list = usePagedList((page, signal) => listAdminUsers({ q: debounced || undefined, page, signal }), [debounced]);

  const update = async (u: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'active'>>) => {
    try {
      const next = await updateAdminUser(u.id, {
        firstName: u.firstName,
        lastName: u.lastName,
        bio: u.bio,
        role: patch.role ?? u.role,
        active: patch.active ?? u.active,
      });
      list.setItems((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  const confirm = (title: string, message: string, onOk: () => void) =>
    Alert.alert(title, message, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: onOk }]);

  const header = (
    <View style={{ marginBottom: 12 }}>
      <TextField label="Kullanıcı ara" value={query} onChangeText={setQuery} placeholder="Ad, soyad ya da e-posta" autoCapitalize="none" />
    </View>
  );

  if (list.loading && list.items.length === 0) return <Loading />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(u) => String(u.id)}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={listContent}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : <EmptyState title="Kullanıcı bulunamadı" />}
      renderItem={({ item }) => (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={fullNameOf(item)} size={40} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" style={{ fontWeight: '700' }}>{fullNameOf(item)}</Txt>
              <Txt variant="caption" muted numberOfLines={1}>{item.email}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label={item.role === 'ADMIN' ? 'Yönetici' : 'Üye'} tone={item.role === 'ADMIN' ? 'lilac' : 'primary'} />
            <Chip label={item.active ? 'Aktif' : 'Pasif'} tone={item.active ? 'primary' : 'rose'} />
            <Chip label={item.emailVerified ? 'E-posta doğrulandı' : 'Doğrulanmadı'} tone={item.emailVerified ? 'sky' : 'apricot'} />
            <Chip label={item.healthConsentAt ? 'Sağlık rızası var' : 'Sağlık rızası yok'} tone={item.healthConsentAt ? 'primary' : 'apricot'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title={item.active ? 'Pasife al' : 'Aktifleştir'}
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => confirm(item.active ? 'Hesabı pasife al' : 'Hesabı aktifleştir', fullNameOf(item), () => update(item, { active: !item.active }))}
            />
            <Button
              title={item.role === 'ADMIN' ? 'Yöneticiliği al' : 'Yönetici yap'}
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => confirm('Rolü değiştir', fullNameOf(item), () => update(item, { role: item.role === 'ADMIN' ? 'USER' : 'ADMIN' }))}
            />
          </View>
        </Card>
      )}
    />
  );
}

export default function AdminUsers() {
  return (
    <AdminGuard>
      <Users />
    </AdminGuard>
  );
}
