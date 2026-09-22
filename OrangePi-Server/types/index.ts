export interface Zone {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface Target {
  id: number
  x: number
  y: number
  valid: number
}

export interface Point {
  id: number
  x: number
  y: number
}

export interface WsMessage {
  targets: Target[]
}

export interface WsLogEntry {
  timestamp: string
  rawMessage: string
  parsedData: WsMessage | null
}
