import { useState, useEffect, useRef } from 'react'
import { Point, WsMessage, WsLogEntry, Target } from '@/types'
import { config } from '@/config'

const formatTimestamp = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`
}

export const useWebSocket = (url: string) => {
  const [points, setPoints] = useState<Point[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<WsLogEntry[]>([])
  const logsLimit = 100
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    setPoints([])
    setLogs([])

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      const timestamp = formatTimestamp(new Date())
      let parsedData: WsMessage | null = null

      try {
        parsedData = JSON.parse(event.data)
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }

      setLogs((prevLogs) => {
        const newLog: WsLogEntry = {
          timestamp,
          rawMessage: event.data,
          parsedData,
        }
        const updatedLogs = [newLog, ...prevLogs]
        return updatedLogs.slice(0, logsLimit)
      })

      if (parsedData && Array.isArray(parsedData.targets)) {
        setPoints(() => {
          const validTargets = parsedData.targets.filter(
            (target: Target) => target.valid === 1
          )
          return validTargets.map((target: Target) => ({
            id: target.id,
            x: target.x,
            y: target.y,
          }))
        })
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [url])

  const clearLogs = () => setLogs([])

  return { points, isConnected, logs, clearLogs }
}
