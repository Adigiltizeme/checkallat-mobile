import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const BEAT_MS = 600;

// Beat 1 : grosse caisse (sub-bass 55→35 Hz, 350 ms)
// Beat 2 : timbale grave (110→65 Hz, 500 ms)
// Les deux se terminent naturellement — le suivant démarre à T+600ms
// sans interrompre le précédent.

export function useBeatSound(active: boolean) {
  const kickRef  = useRef<Audio.Sound | null>(null);
  const tomRef   = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beatRef  = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = async (delayMs: number) => {
      timerRef.current = setTimeout(async () => {
        if (cancelled || !activeRef.current) return;
        const isKick = beatRef.current % 2 === 0;
        beatRef.current += 1;
        const sound = isKick ? kickRef.current : tomRef.current;
        if (sound) {
          try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
          } catch (_) {}
        }
        scheduleNext(BEAT_MS);
      }, delayMs);
    };

    const start = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          shouldDuckAndroid: false, // ne pas baisser les autres sons — priorité max
          staysActiveInBackground: false,
        });

        const [{ sound: kick }, { sound: tom }] = await Promise.all([
          Audio.Sound.createAsync(
            require('../../assets/sounds/perc_kick.wav'),
            { shouldPlay: false, volume: 1.0 },
          ),
          Audio.Sound.createAsync(
            require('../../assets/sounds/perc_tom.wav'),
            { shouldPlay: false, volume: 1.0 },
          ),
        ]);

        if (cancelled) {
          await kick.unloadAsync();
          await tom.unloadAsync();
          return;
        }

        kickRef.current = kick;
        tomRef.current  = tom;
        beatRef.current = 0;
        activeRef.current = true;

        // Premier beat immédiat, puis toutes les 600 ms
        scheduleNext(0);
      } catch (_) {}
    };

    const stop = async () => {
      activeRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // On laisse les sons terminer leur decay naturellement — pas de stopAsync()
      for (const ref of [kickRef, tomRef]) {
        if (ref.current) {
          try { await ref.current.unloadAsync(); } catch (_) {}
          ref.current = null;
        }
      }
    };

    if (active) {
      start();
    } else {
      stop();
    }

    return () => {
      cancelled = true;
      stop();
    };
  }, [active]);
}
