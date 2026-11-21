import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { hapticError, hapticSelect, hapticSuccess } from '@/utils/haptics';

// ---------------------------------------------------------------------------
// Skeleton: yükleme sırasında içeriğin iskeletini nabız gibi atan gri bloklar.
// ---------------------------------------------------------------------------
function usePulse() {
  const v = useState(() => new Animated.Value(0.45))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.45, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

export function Skeleton({ width = '100%', height = 14, round = 8, style }: { width?: DimensionValue; height?: number; round?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: round, backgroundColor: t.surfaceAlt, opacity }, style]}
    />
  );
}

export function PostSkeleton() {
  const t = useTheme();
  return (
    <View accessibilityLabel="Yükleniyor" style={{ backgroundColor: t.surface, paddingVertical: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg }}>
        <Skeleton width={36} height={36} round={18} />
        <View style={{ gap: 6 }}>
          <Skeleton width={120} height={12} />
          <Skeleton width={70} height={10} />
        </View>
      </View>
      <Skeleton height={220} round={0} />
      <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="65%" height={14} />
      </View>
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View accessibilityLabel="Yükleniyor" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: spacing.lg }}>
      <Skeleton width={52} height={52} round={26} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="45%" height={13} />
        <Skeleton width="80%" height={11} />
      </View>
    </View>
  );
}

export function ListSkeleton({ kind = 'post', count = 3 }: { kind?: 'post' | 'row'; count?: number }) {
  return (
    <View style={{ gap: kind === 'post' ? 12 : 0 }}>
      {Array.from({ length: count }, (_, i) => (kind === 'post' ? <PostSkeleton key={i} /> : <RowSkeleton key={i} />))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Toast: Alert yerine, akışı bölmeyen kısa bildirim.
// ---------------------------------------------------------------------------
type ToastKind = 'success' | 'error' | 'info';
type ToastApi = { show: (message: string, kind?: ToastKind) => void };
const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string; kind: ToastKind } | null>(null);
  const anim = useState(() => new Animated.Value(0))[0];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      if (kind === 'success') hapticSuccess();
      if (kind === 'error') hapticError();
      setToast({ id: Date.now(), message, kind });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [anim],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const icon = toast?.kind === 'success' ? 'checkmark-circle' : toast?.kind === 'error' ? 'alert-circle' : 'information-circle';
  const color = toast?.kind === 'success' ? t.primaryBright : toast?.kind === 'error' ? t.rose : t.sky;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            top: insets.top + 8,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.mode === 'dark' ? t.surfaceAlt : '#173530',
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Ionicons name={icon} size={20} color={color as string} />
            <Txt variant="small" color="#FFFFFF" style={{ flex: 1, fontWeight: '600' }}>
              {toast.message}
            </Txt>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ActionSheet: alttan açılan menü (Alert listesi yerine).
// ---------------------------------------------------------------------------
export type SheetAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

export function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (visible) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 3 }).start();
    else anim.setValue(0);
  }, [visible, anim]);

  const close = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(onClose);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', opacity: anim }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" style={{ flex: 1 }} onPress={close} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: insets.bottom + 12,
            paddingTop: 8,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.borderStrong, marginBottom: 8 }} />
          {title ? (
            <Txt variant="caption" muted style={{ textAlign: 'center', paddingBottom: 8 }}>
              {title}
            </Txt>
          ) : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                hapticSelect();
                Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
                  onClose();
                  a.onPress();
                });
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                minHeight: 54,
                paddingHorizontal: spacing.xl,
                backgroundColor: pressed ? t.surfaceAlt : 'transparent',
              })}
            >
              {a.icon && <Ionicons name={a.icon} size={22} color={(a.destructive ? t.rose : t.ink) as string} />}
              <Txt variant="body" color={a.destructive ? t.rose : t.ink} style={{ fontWeight: '600' }}>
                {a.label}
              </Txt>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const absoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
