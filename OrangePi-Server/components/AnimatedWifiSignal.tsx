import { useState, useEffect } from 'react'
import { WifiZero, WifiLow, WifiHigh, Wifi } from 'lucide-react'

export function AnimatedWifiSignal() {
  const [signalIndex, setSignalIndex] = useState(0)
  const signals = [
    <WifiZero key="off" className="w-6 h-6 text-indigo-500/60 dark:text-indigo-400/60 drop-shadow-sm" />,
    <WifiLow key="low" className="w-6 h-6 text-indigo-500/80 dark:text-indigo-400/80 drop-shadow-sm" />,
    <WifiHigh key="medium" className="w-6 h-6 text-indigo-600 dark:text-indigo-300 drop-shadow-sm" />,
    <Wifi key="full" className="w-6 h-6 text-indigo-600 dark:text-indigo-300 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setSignalIndex((current) => (current + 1) % signals.length)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return signals[signalIndex]
}
