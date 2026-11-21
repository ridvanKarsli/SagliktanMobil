import * as Haptics from 'expo-haptics';

// Dokunsal geri bildirim: hata verirse (cihaz desteklemiyorsa) sessizce yok sayılır.
const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};
export const hapticLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hapticSelect = () => safe(() => Haptics.selectionAsync());
export const hapticSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hapticError = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
