import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const BEAT_MS = 600;

// Beat 1 : grosse caisse (sub-bass 55→35 Hz, 350 ms)
// Beat 2 : timbale grave (110→65 Hz, 500 ms)
// Les deux se terminent naturellement — le suivant démarre à T+600ms
// sans interrompre le précédent.

export function useBeatSound(active: boolean) {
  const kickRef  = useRef<AudioPlayer | null>(null);
  const tomRef   = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beatRef  = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = (delayMs: number) => {
      timerRef.current = setTimeout(() => {
        if (cancelled || !activeRef.current) return;
        const isKick = beatRef.current % 2 === 0;
        beatRef.current += 1;
        const sound = isKick ? kickRef.current : tomRef.current;
        if (sound) {
          try {
            sound.seekTo(0);
            sound.play();
          } catch (_) {}
        }
        scheduleNext(BEAT_MS);
      }, delayMs);
    };

    const start = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers', // ne pas couper les autres sons — priorité max
          shouldPlayInBackground: false,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });

        const kick = createAudioPlayer(require('../../assets/sounds/perc_kick.wav'));
        const tom  = createAudioPlayer(require('../../assets/sounds/perc_tom.wav'));
        kick.volume = 1.0;
        tom.volume  = 1.0;

        if (cancelled) {
          kick.remove();
          tom.remove();
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

    const stop = () => {
      activeRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // On laisse les sons terminer leur decay naturellement — pas de stopAsync()
      for (const ref of [kickRef, tomRef]) {
        if (ref.current) {
          try { ref.current.remove(); } catch (_) {}
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
