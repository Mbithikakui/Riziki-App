// frontend/src/utils/animationConfig.ts
import { Platform } from 'react-native';

/**
 * useNativeDriver is not supported on web.
 * Use this helper for all Animated configs.
 */
export const nativeDriver = Platform.OS !== 'web';

// Example usage:
// Animated.timing(fadeAnim, {
//   toValue: 1,
//   duration: 300,
//   useNativeDriver: nativeDriver,  // <-- use this everywhere
// }).start();
