import { trigger } from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

export const haptics = {
  tap: () => trigger('selection', options),
  toggle: () => trigger('impactLight', options),
  success: () => trigger('notificationSuccess', options),
  warning: () => trigger('notificationWarning', options),
};
