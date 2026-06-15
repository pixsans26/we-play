import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Formats a non-negative integer of seconds into "MM:SS" format.
 * Exported separately for property-based testing (Property 8).
 */
export function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isFinished: boolean;
  formattedTime: string;
  start: () => void;
  reset: () => void;
}

/**
 * Hook providing countdown timer logic with MM:SS formatting and start/reset controls.
 * Requirements: 6.4, 6.5
 */
export function useTimer(initialSeconds: number): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning || isFinished) return;
    setIsRunning(true);
  }, [isRunning, isFinished]);

  const reset = useCallback(() => {
    clearTimer();
    setTimeLeft(initialSeconds);
    setIsRunning(false);
    setIsFinished(false);
  }, [initialSeconds, clearTimer]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [isRunning, clearTimer]);

  const formattedTime = formatTime(timeLeft);

  return {
    timeLeft,
    isRunning,
    isFinished,
    formattedTime,
    start,
    reset,
  };
}
