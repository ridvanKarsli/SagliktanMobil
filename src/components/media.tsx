import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { hapticLight } from '@/utils/haptics';
export type PostAttachment = { id: number; url: string; sortOrder: number };

const sorted = (a: PostAttachment[]) => [...a].sort((x, y) => x.sortOrder - y.sortOrder);

// Tam ekran görüntüleyici: yatay kaydırma, (iOS'ta) sıkıştırarak yakınlaştırma, dokunarak kapatma.
export function ImageViewer({ images, index, visible, onClose }: { images: PostAttachment[]; index: number; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [swiped, setSwiped] = useState<number | null>(null);
  const current = swiped ?? index;
  const close = () => {
    setSwiped(null);
    onClose();
  };
  const list = sorted(images);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={list}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(index, Math.max(0, list.length - 1))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(a) => String(a.id)}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setSwiped(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ScrollView style={{ width, height }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} maximumZoomScale={4} minimumZoomScale={1} centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
              <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={close}>
                <Image source={{ uri: item.url }} contentFit="contain" style={{ width, height: height * 0.8 }} accessibilityLabel="Gönderideki fotoğraf" />
              </Pressable>
            </ScrollView>
          )}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          onPress={close}
          hitSlop={10}
          style={{ position: 'absolute', top: insets.top + 8, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        {list.length > 1 && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Txt variant="caption" color="#fff">{current + 1} / {list.length}</Txt>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Akıştaki fotoğraf alanı: tam genişlik, kaydırmalı galeri, noktalar,
// çift dokunmayla beğeni (kalp animasyonu), tek dokunmayla büyütme.
export function PostMedia({ attachments, onDoubleTap }: { attachments: PostAttachment[]; onDoubleTap: () => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const list = sorted(attachments);
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState(false);
  const heart = useState(() => new Animated.Value(0))[0];
  const lastTap = useRef(0);
  const singleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (singleTimer.current) clearTimeout(singleTimer.current);
  }, []);

  const size = Math.round(width * 1.05);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (singleTimer.current) clearTimeout(singleTimer.current);
      lastTap.current = 0;
      hapticLight();
      heart.setValue(0);
      Animated.sequence([
        Animated.spring(heart, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 14 }),
        Animated.delay(350),
        Animated.timing(heart, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      onDoubleTap();
    } else {
      lastTap.current = now;
      singleTimer.current = setTimeout(() => setViewer(true), 280);
    }
  };

  return (
    <View>
      <FlatList
        data={list}
        horizontal
        pagingEnabled
        scrollEnabled={list.length > 1}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(a) => String(a.id)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel="Fotoğrafı büyüt" onPress={onTap}>
            <Image source={{ uri: item.url }} contentFit="cover" transition={180} style={{ width, height: size, backgroundColor: t.surfaceAlt }} accessibilityLabel="Gönderideki fotoğraf" />
          </Pressable>
        )}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: heart,
          transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) }],
        }}
      >
        <Ionicons name="thumbs-up" size={92} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 12 }} />
      </Animated.View>
      {list.length > 1 && (
        <>
          <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Txt variant="caption" color="#fff">{page + 1}/{list.length}</Txt>
          </View>
          <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
            {list.map((a, i) => (
              <View key={a.id} style={{ width: i === page ? 7 : 6, height: i === page ? 7 : 6, borderRadius: 4, backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </View>
        </>
      )}
      <ImageViewer images={attachments} index={page} visible={viewer} onClose={() => setViewer(false)} />
    </View>
  );
}
