import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useNotificationSound(count: number) {
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (count > prevCountRef.current) {
      const playOnce = async () => {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: false,
            shouldDuckAndroid: false,
            staysActiveInBackground: false,
          });
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/perc_kick.wav'),
            { shouldPlay: true, volume: 1.0 },
          );
          sound.setOnPlaybackStatusUpdate((s) => {
            if ('didJustFinish' in s && s.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
        } catch (_) {}
      };
      playOnce();
    }
    prevCountRef.current = count;
  }, [count]);
}
