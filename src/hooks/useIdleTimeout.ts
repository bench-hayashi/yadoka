import { useCallback, useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 500
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

type UseIdleTimeoutOptions = {
  timeoutMinutes: number
  warningMinutes: number
  onTimeout: () => void
  enabled: boolean
}

type UseIdleTimeoutReturn = {
  showWarning: boolean
  remainingSeconds: number
  resetTimer: () => void
}

export function useIdleTimeout({
  timeoutMinutes,
  warningMinutes,
  onTimeout,
  enabled,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(timeoutMinutes * 60)

  const lastResetTime = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const scheduleTimers = useCallback(() => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(logoutTimerRef.current)

    lastResetTime.current = Date.now()

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, (timeoutMinutes - warningMinutes) * 60 * 1000)

    logoutTimerRef.current = setTimeout(() => {
      onTimeoutRef.current()
    }, timeoutMinutes * 60 * 1000)
  }, [timeoutMinutes, warningMinutes])

  const resetTimer = useCallback(() => {
    clearTimeout(debounceRef.current)
    setShowWarning(false)
    scheduleTimers()
  }, [scheduleTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimeout(warningTimerRef.current)
      clearTimeout(logoutTimerRef.current)
      clearTimeout(debounceRef.current)
      setShowWarning(false)
      setRemainingSeconds(timeoutMinutes * 60)
      return
    }

    scheduleTimers()

    return () => {
      clearTimeout(warningTimerRef.current)
      clearTimeout(logoutTimerRef.current)
    }
  }, [enabled, scheduleTimers, timeoutMinutes])

  useEffect(() => {
    if (!enabled) return

    const handleActivity = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setShowWarning(false)
        scheduleTimers()
      }, DEBOUNCE_MS)
    }

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      clearTimeout(debounceRef.current)
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, scheduleTimers])

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastResetTime.current) / 1000
      setRemainingSeconds(Math.max(0, Math.floor(timeoutMinutes * 60 - elapsed)))
    }, 1000)

    return () => clearInterval(interval)
  }, [enabled, timeoutMinutes])

  return { showWarning, remainingSeconds, resetTimer }
}
