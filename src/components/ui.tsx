import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';

// --- Ekran iskeleti ---
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  padded = true,
  onRefresh,
  refreshing = false,
  keyboardAware = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  keyboardAware?: boolean;
}) {
  const t = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && { padding: spacing.lg }, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={keyboardAware}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { padding: spacing.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.background }}>
      {content}
    </SafeAreaView>
  );
}

// Liste içeriği için alt güvenli alanı (ana sayfa çubuğu / navigasyon çubuğu) hesaba katan stil.
export function useListContent(gap = 12) {
  const { bottom } = useSafeAreaInsets();
  return { padding: spacing.lg, gap, flexGrow: 1, paddingBottom: spacing.lg + bottom } as const;
}

// --- Yazı ---
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
const TYPE: Record<Variant, { fontSize: number; fontWeight: '400' | '600' | '700' | '800'; lineHeight: number }> = {
  h1: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  // Az gören üyeler için gövde 17, en küçük yazı 14 punto.
  body: { fontSize: 17, fontWeight: '400', lineHeight: 26 },
  small: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
};

// Telefonun "yazı boyutu" ayarı iki katına kadar izlenir; görme güçlüğü
// olan üyeler için bilerek yüksek tutuldu.
export const MAX_FONT_SCALE = 2;

export function Txt({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: {
  variant?: Variant;
  color?: string;
  muted?: boolean;
} & React.ComponentProps<typeof Text>) {
  const t = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[TYPE[variant], { color: color ?? (muted ? t.inkSoft : t.ink) }, style]}
    />
  );
}

// --- Buton ---
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const inactive = disabled || loading;
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.rose : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.onRose : variant === 'ghost' ? t.primary : t.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'outline' ? t.borderStrong : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// --- Metin alanı ---
export function TextField({
  label,
  error,
  helper,
  secure,
  style,
  ...rest
}: {
  label: string;
  error?: string | null;
  helper?: string;
  secure?: boolean;
} & Omit<TextInputProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={[{ gap: 6 }, style]}>
      <Txt variant="small" style={{ fontWeight: '700' }}>
        {label}
      </Txt>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: t.surface,
            borderColor: error ? t.rose : focused ? t.primary : t.borderStrong,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}
      >
        <TextInput
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={t.inkMuted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{ flex: 1, color: t.ink, fontSize: 17, paddingVertical: 10, minHeight: MIN_TOUCH }}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={t.inkSoft} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Txt variant="caption" color={t.rose} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : helper ? (
        <Txt variant="caption" muted>
          {helper}
        </Txt>
      ) : null}
    </View>
  );
}

// --- Onay kutusu ---
export function CheckRow({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  error?: string | null;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: MIN_TOUCH, paddingVertical: 4 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            marginTop: 1,
            borderWidth: 2,
            borderColor: error ? t.rose : checked ? t.primary : t.borderStrong,
            backgroundColor: checked ? t.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && <Ionicons name="checkmark" size={16} color={t.onPrimary} />}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Pressable>
      {error ? (
        <Txt variant="caption" color={t.rose} style={{ marginLeft: 36 }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

// --- Kart / rozet / ayraç ---
export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    padding: spacing.lg,
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Chip({ label, tone = 'primary', icon }: { label: string; tone?: 'primary' | 'sky' | 'lilac' | 'apricot' | 'rose'; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = useTheme();
  const map = {
    primary: [t.primarySoft, t.primary],
    sky: [t.skySoft, t.sky],
    lilac: [t.lilacSoft, t.lilac],
    apricot: [t.apricotSoft, t.apricotInk],
    rose: [t.roseSoft, t.rose],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// Ada göre sabit, canlı bir renk seçilir (herkes aynı yeşil olmasın).
const AVATAR_HUES = ['#157461', '#2A6FA6', '#6A52C8', '#C2385A', '#B7791F', '#0E7C86', '#8A4FBF', '#3B7A3B'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toLocaleUpperCase('tr-TR');
  const color = avatarColor(name);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Baş harfler sabit boyutlu dairenin içinde: yazı ölçeklemesi kapalı. */}
      <Text allowFontScaling={false} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.4 }}>{initials || '?'}</Text>
    </View>
  );
}

// --- Durumlar ---
export function Loading({ label = 'Yükleniyor' }: { label?: string }) {
  const t = useTheme();
  return (
    <View accessibilityLabel={label} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, text, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color={t.primary} />
      </View>
      <Txt variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {text ? (
        <Txt variant="small" muted style={{ textAlign: 'center' }}>
          {text}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Bir sorun oluştu"
      text={message}
      action={onRetry ? <Button title="Tekrar dene" variant="outline" onPress={onRetry} /> : undefined}
    />
  );
}

export function Banner({ text, tone = 'info' }: { text: string; tone?: 'info' | 'error' | 'success' }) {
  const t = useTheme();
  const bg = tone === 'error' ? t.roseSoft : tone === 'success' ? t.primarySoft : t.skySoft;
  const fg = tone === 'error' ? t.rose : tone === 'success' ? t.primary : t.sky;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: radius.sm, padding: spacing.md }}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    gap: 8,
  },
});
