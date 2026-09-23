import { useState, useEffect, useRef } from 'react'
import { Point, WsMessage, WsLogEntry, Target } from '@/types'
import { config } from '@/config'

const formatTimestamp = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`
}

const LOGS_LIMIT = 500
const RECONNECT_DELAY_MS = 1500

export const useWebSocket = (url: string) => {
  const [points, setPoints] = useState<Point[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<WsLogEntry[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destroyedRef = useRef(false)

  const connect = () => {
    if (destroyedRef.current) return
    try {
      wsRef.current?.close()
    } catch {
      /* noop */
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (destroyedRef.current) return
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      if (destroyedRef.current) return
      const timestamp = formatTimestamp(new Date())
      let parsedData: WsMessage | null = null

      try {
        parsedData = JSON.parse(event.data) as WsMessage
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }

      setLogs((prevLogs) => {
        const newLog: WsLogEntry = {
          timestamp,
          rawMessage: event.data,
          parsedData,
        }
        if (prevLogs.length + 1 > LOGS_LIMIT) {
          const updated = [newLog, ...prevLogs]
          return updated.slice(0, LOGS_LIMIT)
        }
        return [newLog, ...prevLogs]
      })

      if (parsedData && Array.isArray(parsedData.targets)) {
        const validTargets = parsedData.targets.filter(
          (target: Target) => target.valid === 1
        )
        const nextPoints: Point[] = validTargets.map((target: Target) => ({
          id: target.id,
          x: target.x,
          y: target.y,
        }))
        setPoints(nextPoints)
      }
    }

    ws.onclose = () => {
      if (destroyedRef.current) return
      setIsConnected(false)
      setPoints([])
      scheduleReconnect()
    }

    ws.onerror = () => {
      if (destroyedRef.current) return
      try {
        ws.close()
      } catch {
        /* noop */
      }
    }
  }

  const scheduleReconnect = () => {
    if (destroyedRef.current) return
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      connect()
    }, RECONNECT_DELAY_MS)
  }

  useEffect(() => {
    destroyedRef.current = false
    setPoints([])
    setLogs([])
    connect()

    return () => {
      destroyedRef.current = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      try {
        wsRef.current?.close()
      } catch {
        /* noop */
      }
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  const clearLogs = () => setLogs([])

  return { points, isConnected, logs, clearLogs }
}
