import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Honour the system preference for Shopping's existing modal and swipe transitions. */
export const useShoppingMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduceMotion;
};
