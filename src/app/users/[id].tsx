import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import PostList from '@/components/PostList';
import { Avatar, Banner, Button, Chip, ErrorState, Loading, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { blockUser, getUserPosts, getUserPublicProfile, reportUser, sendMessageRequest } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { formatCount, fullNameOf } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';
import { usePagedList } from '@/utils/usePagedList';

const ROLE_LABEL: Record<string, string> = {
  PATIENT: 'Hasta',
  CAREGIVER: 'Hasta yakını',
  PROFESSIONAL: 'Sağlık profesyoneli',
  OTHER: 'Üye',
};

export default function UserProfileScreen() {
  const { user: me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const profile = useAsync(() => getUserPublicProfile(userId), [userId]);
  const hidden = profile.data?.profileHidden ?? true;
  const list = usePagedList(
    (page, signal) =>
      hidden ? Promise.resolve({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true }) : getUserPosts(userId, { page, signal }),
    [userId, hidden],
  );
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (profile.loading && !profile.data) return <Loading />;
  if (!profile.data) return <ErrorState message={profile.error ?? 'Profil yüklenemedi.'} onRetry={profile.reload} />;
  const p = profile.data;
  const isMe = me?.id === p.id;

  const message = async () => {
    setBusy(true);
    try {
      const res = await sendMessageRequest(p.id);
      if (res?.autoAccepted && res.conversationId) {
        router.push({ pathname: '/chat/[id]', params: { id: String(res.conversationId) } });
      } else {
        setSent(true);
      }
    } catch (err) {
      Alert.alert('Mesaj isteği gönderilemedi', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const report = () =>
    Alert.alert('Kullanıcıyı şikayet et', 'Bu kullanıcı topluluk kurallarına aykırı davranıyor mu?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Şikayet et',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportUser(p.id);
            Alert.alert('Teşekkürler', 'Şikayetin alındı.');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);

  const block = () =>
    Alert.alert('Kullanıcıyı engelle', `${fullNameOf(p)} sana mesaj gönderemeyecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Engelle',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(p.id);
            Alert.alert('Engellendi', 'Engellenenler listesinden kaldırabilirsin.');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={fullNameOf(p)} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="h2">{fullNameOf(p)}</Txt>
          {p.communityRole && <Chip label={ROLE_LABEL[p.communityRole] ?? 'Üye'} />}
        </View>
      </View>
      {p.profileHidden ? (
        <Banner text="Bu üye profilini kapalı tuttuğu için yalnızca adı görünüyor." />
      ) : (
        <>
          {p.bio ? <Txt muted>{p.bio}</Txt> : null}
          <Txt variant="caption" muted>
            {formatCount(p.postCount)} gönderi · {formatCount(p.commentCount)} yorum · {formatCount(p.helpedPeople)} kişiye faydalı
          </Txt>
        </>
      )}
      {!isMe && (
        <View style={{ gap: 8 }}>
          {sent ? (
            <Banner tone="success" text="Mesaj isteği gönderildi. Kabul edilince yazışabilirsiniz." />
          ) : (
            <Button title="Mesaj isteği gönder" icon="chatbubble-outline" onPress={message} loading={busy} />
          )}
          <Button title="Engelle" variant="ghost" icon="ban-outline" onPress={block} />
          <Button title="Şikayet et" variant="ghost" icon="flag-outline" onPress={report} />
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: fullNameOf(p) }} />
      <PostList list={list} header={header} showGroup emptyTitle={p.profileHidden ? 'Gönderiler gizli' : 'Henüz gönderi yok'} />
    </>
  );
}
