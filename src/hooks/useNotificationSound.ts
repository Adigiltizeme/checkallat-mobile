import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export function useNotificationSound(count: number) {
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (count > prevCountRef.current) {
      const playOnce = async () => {
        try {
          await setAudioModeAsync({
            playsInSilentMode: false,
            interruptionMode: 'mixWithOthers',
            shouldPlayInBackground: false,
            allowsRecording: false,
            shouldRouteThroughEarpiece: false,
          });
          const player = createAudioPlayer(
            require('../../assets/sounds/perc_kick.wav'),
          );
          player.volume = 1.0;
          player.play();
          const sub = player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) {
              sub.remove();
              player.remove();
            }
          });
        } catch (_) {}
      };
      playOnce();
    }
    prevCountRef.current = count;
  }, [count]);
}
