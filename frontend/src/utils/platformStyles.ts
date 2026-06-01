// frontend/src/utils/platformStyles.ts
import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow — uses boxShadow on web,
 * native shadow props on iOS/Android
 */
export const createShadow = (
  elevation: number = 4,
  color: string = '#000'
): ViewStyle => {
  if (Platform.OS === 'web') {
    return {
      // Web uses boxShadow — no deprecated shadow* props
      boxShadow: `0px ${elevation}px ${elevation * 2}px rgba(0,0,0,0.12)`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: 0.12,
    shadowRadius: elevation,
    elevation,
  };
};

/**
 * Pointer events — use style prop instead of component prop
 */
export const pointerEventsStyle = (value: 'none' | 'box-none' | 'box-only' | 'auto') => ({
  style: { pointerEvents: value },
});
