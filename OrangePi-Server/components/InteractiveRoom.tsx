'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MoveableResizableZone } from './MoveableResizableZone'
import { AnimatedWifiSignal } from './AnimatedWifiSignal'
import { DetectedPoints } from './DetectedPoints'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Zone, WsLogEntry } from '@/types'
import { mapCoordinate } from '@/utils/coordinates'
import { getConfig } from '@/config'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from './ThemeToggle'
import { Footer } from './Footer'
import {
  Trash2,
  Radar,
  Users,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Eraser,
  Plus,
  RotateCcw,
  Settings2,
  ScrollText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`
}

export function InteractiveRoomEsp32() {
  const [mounted, setMounted] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentIp, setCurrentIp] = useState(getConfig().esp32.defaultIp)
  const [customIp, setCustomIp] = useState('')
  const [savedIps, setSavedIps] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('savedIps')
    if (saved) {
      const parsedIps = JSON.parse(saved)
      setSavedIps(parsedIps)
      if (parsedIps.length > 0) {
        setCurrentIp(parsedIps[0])
      }
    } else {
      const defaultIp = getConfig().esp32.defaultIp
      setSavedIps([defaultIp])
      setCurrentIp(defaultIp)
      localStorage.setItem('savedIps', JSON.stringify([defaultIp]))
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('savedIps', JSON.stringify(savedIps))
    }
  }, [savedIps, mounted])

  const roomRef = useRef<HTMLDivElement>(null)
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 })
  const config = getConfig(currentIp)
  const colors = config.zones.colors
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')

  const { points, logs, clearLogs, isConnected: wsConnected } = useWebSocket(config.esp32.webSocketUrl)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logCollapsed, setLogCollapsed] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  const handleIpChange = (value: string) => {
    if (value === 'custom') {
      setCurrentIp('custom')
      return
    }
    setCurrentIp(value)
  }

  const handleCustomIpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (customIp && /^(\d{1,3}\.){3}\d{1,3}$/.test(customIp)) {
      setCurrentIp(customIp)
      if (!savedIps.includes(customIp)) {
        setSavedIps(prev => [...prev, customIp])
      }
      setCustomIp('')
    }
  }

  const handleDeleteIp = (ipToDelete: string) => {
    const updatedIps = savedIps.filter(ip => ip !== ipToDelete)
    setSavedIps(updatedIps)

    if (currentIp === ipToDelete) {
      const nextIp = updatedIps.length > 0 ? updatedIps[0] : 'custom'
      setCurrentIp(nextIp)
    }
  }

  useEffect(() => {
    const updateRoomSize = () => {
      if (roomRef.current) {
        setRoomSize({
          width: roomRef.current.offsetWidth,
          height: roomRef.current.offsetHeight
        })
      }
    }

    updateRoomSize()
    window.addEventListener('resize', updateRoomSize)
    return () => window.removeEventListener('resize', updateRoomSize)
  }, [])

  const zoneFetchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const ZONE_REFRESH_MS = 5 * 60 * 1000

    const fetchZones = async () => {
      zoneFetchAbortRef.current?.abort()
      const ac = new AbortController()
      zoneFetchAbortRef.current = ac

      try {
        const response = await fetch('/api/zones', {
          headers: { 'x-esp32-ip': currentIp },
          signal: ac.signal,
        })
        if (response.ok) {
          const data = await response.json()
          setZones(data.map((zone: Zone, index: number) => ({
            ...zone,
            id: index + 1,
            color: colors[index % colors.length],
          })))
          setConnectionStatus('connected')
        } else {
          throw new Error('Connection failed')
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error('Failed to fetch zones:', error)
        setZones([])
        setConnectionStatus('disconnected')
      }
    }

    fetchZones()
    const intervalId = setInterval(fetchZones, ZONE_REFRESH_MS)

    return () => {
      clearInterval(intervalId)
      zoneFetchAbortRef.current?.abort()
    }
  }, [currentIp, colors])

  const createNewZone = () => {
    if (roomRef.current && zones.length < 3) {
      const rect = roomRef.current.getBoundingClientRect()
      const x1 = Math.max(-4000, Math.min(4000, Math.round(mapCoordinate(rect.width / 2, 0, roomSize.width, -4000, 4000))))
      const y1 = Math.max(1, Math.min(6000, Math.round(mapCoordinate(rect.height / 2, 0, roomSize.height, 1, 6000))))
      const x2 = Math.max(-4000, Math.min(4000, x1 + 2000))
      const y2 = Math.min(6000, Math.max(1, y1 + 2000))
      const color = colors[zones.length % colors.length]
      const newZone = { id: zones.length + 1, x1, y1, x2, y2, color }
      setZones(prevZones => [...prevZones, newZone])
      sendZoneUpdate([...zones, newZone])
    }
  }

  const resetZones = () => {
    setZones([])
    sendZoneUpdate([])
  }

  const handleResize = (id: number, x1: number, y1: number, x2: number, y2: number) => {
    const updatedZones = zones.map(zone =>
      zone.id === id ? { ...zone, x1, y1, x2, y2 } : zone
    )
    setZones(updatedZones)
    sendZoneUpdate(updatedZones)
  }

  const handleMove = (id: number, x1: number, y1: number, x2: number, y2: number) => {
    const updatedZones = zones.map(zone =>
      zone.id === id ? { ...zone, x1, y1, x2, y2 } : zone
    )
    setZones(updatedZones)
    sendZoneUpdate(updatedZones)
  }

  const handleDelete = (id: number) => {
    const updatedZones = zones.filter(zone => zone.id !== id)
    setZones(updatedZones)
    sendZoneUpdate(updatedZones)
  }

  const sendZoneUpdate = async (updatedZones: Zone[]) => {
    if (!isEditMode) {
      const esp32Zones = updatedZones.map(({ id, x1, y1, x2, y2 }) => ({ id, x1, y1, x2, y2 }))
      try {
        const response = await fetch('/api/zones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-esp32-ip': currentIp
          },
          body: JSON.stringify(esp32Zones),
        })
        if (!response.ok) {
          throw new Error('Failed to update zones')
        }
      } catch (error) {
        console.error('Error updating zones:', error)
      }
    }
  }

  const sendFinalZoneUpdate = async () => {
    const esp32Zones = zones.map(({ id, x1, y1, x2, y2 }) => ({ id, x1, y1, x2, y2 }))
    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-esp32-ip': currentIp
        },
        body: JSON.stringify(esp32Zones),
      })
      if (!response.ok) {
        throw new Error('Failed to update zones')
      }
    } catch (error) {
      console.error('Error updating zones:', error)
    }
  }

  const combinedConnected = connectionStatus === 'connected' || wsConnected
  const detectedCount = points.length
  const validTargetLogs = logs.filter(l => l.parsedData?.targets.some(t => t.valid === 1)).length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20">
              <Radar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                LD2450 Detection App
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Human Presence Radar · Zone Monitoring Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-mono text-muted-foreground">ESP32 IP:</span>
              <span className="font-mono font-semibold">{currentIp === 'custom' ? '...' : currentIp}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              combinedConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {combinedConnected
                ? <><Wifi className="h-3.5 w-3.5" /><span className="hidden sm:inline">Connected</span><span className="sm:hidden">ON</span></>
                : <><WifiOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Disconnected</span><span className="sm:hidden">OFF</span></>}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* IP & Controls Row */}
        <div className="mb-4 sm:mb-6 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-border/50 bg-card p-3 sm:p-4 shadow-sm">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> ESP32:
            </span>
            {currentIp === 'custom' ? (
              <form onSubmit={handleCustomIpSubmit} className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  type="text"
                  placeholder="Enter IP address"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  pattern="^(\d{1,3}\.){3}\d{1,3}$"
                  className="flex-1 min-w-0 h-9 text-sm"
                />
                <Button type="submit" size="sm">Add</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentIp(getConfig().esp32.defaultIp)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex-1 min-w-0 max-w-sm">
                <Select value={currentIp} onValueChange={handleIpChange}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select IP" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedIps.map(ip => (
                      <div key={ip} className="flex items-center justify-between px-2 py-1 hover:bg-accent">
                        <SelectItem value={ip} className="flex-1 font-mono text-sm">
                          {ip}
                        </SelectItem>
                        <button
                          type="button"
                          onClick={() => handleDeleteIp(ip)}
                          className="p-1 hover:text-red-500 focus:outline-none ml-2 rounded-md hover:bg-red-500/10 transition-colors"
                          title={`Delete ${ip}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <SelectItem value="custom" className="text-sm">+ Add Custom IP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 rounded-2xl border border-border/50 bg-card p-3 sm:p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-mode"
                checked={isEditMode}
                onCheckedChange={(checked) => {
                  setIsEditMode(checked)
                  if (!checked) {
                    sendFinalZoneUpdate()
                  }
                }}
              />
              <Label htmlFor="edit-mode" className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Edit Mode
              </Label>
            </div>

            {isEditMode && (
              <>
                <Button onClick={createNewZone} size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> New Zone
                </Button>
                <Button onClick={resetZones} size="sm" variant="outline" className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Detected"
            value={detectedCount.toString()}
            color="purple"
          />
          <StatCard
            icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Zones"
            value={`${zones.length}/3`}
            color="indigo"
          />
          <StatCard
            icon={<ScrollText className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Events"
            value={`${validTargetLogs}/${logs.length}`}
            color="emerald"
          />
        </div>

        {/* Main 2-col layout on lg+, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch">
          {/* LEFT: Radar Room */}
          <section className="lg:col-span-3 flex flex-col gap-3 sm:gap-4 min-h-0">
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Radar className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Radar View</h2>
                    <p className="text-[10px] text-muted-foreground">8m x 6m Detection Area</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isEditMode
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isEditMode ? 'EDITING' : 'MONITORING'}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-3 sm:p-5 min-h-0 flex">
                <div
                  ref={roomRef}
                  className={`w-full h-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-0 relative rounded-xl overflow-hidden border-2 transition-all
                    ${isEditMode
                      ? 'border-amber-400/50 ring-2 ring-amber-400/20 cursor-crosshair'
                      : 'border-emerald-500/20 dark:border-emerald-500/30 cursor-default'
                    }
                    bg-[radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.08),_transparent_60%),repeating-linear-gradient(0deg,#e5e7eb1a_0_1px,transparent_1px_40px),repeating-linear-gradient(90deg,#e5e7eb1a_0_1px,transparent_1px_40px)]
                    dark:bg-[radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.15),_transparent_60%),repeating-linear-gradient(0deg,#ffffff0a_0_1px,transparent_1px_40px),repeating-linear-gradient(90deg,#ffffff0a_0_1px,transparent_1px_40px)]
                    bg-white dark:bg-slate-950/50
                  `}
                >
                  <div
                    className="absolute"
                    style={{
                      left: mapCoordinate(0, -4000, 4000, 0, roomSize.width),
                      bottom: 0,
                      transform: 'translate(-50%, 10%)',
                      zIndex: 50
                    }}
                  >
                    <AnimatedWifiSignal />
                  </div>

                  {combinedConnected && (
                    <>
                      {zones.map(zone => (
                        <MoveableResizableZone
                          key={zone.id}
                          zone={zone}
                          onResize={handleResize}
                          onMove={handleMove}
                          onDelete={handleDelete}
                          isEditMode={isEditMode}
                          roomWidth={roomSize.width}
                          roomHeight={roomSize.height}
                        />
                      ))}

                      <DetectedPoints
                        points={points}
                        roomWidth={roomSize.width}
                        roomHeight={roomSize.height}
                      />
                    </>
                  )}

                  {/* Axes labels */}
                  <div className="absolute top-1 left-2 text-[9px] font-mono text-muted-foreground/60 pointer-events-none">
                    Y: 6m
                  </div>
                  <div className="absolute bottom-1 left-2 text-[9px] font-mono text-muted-foreground/60 pointer-events-none">
                    0m · LD2450
                  </div>
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-muted-foreground/60 pointer-events-none">
                    X: +4m
                  </div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground/60 pointer-events-none">
                    -4m ← X → +4m
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 shrink-0">
                <p className="text-xs text-muted-foreground text-center">
                  {isEditMode
                    ? zones.length < 3
                      ? "Nhấn New Zone để tạo vùng (tối đa 3). Kéo để di chuyển, kéo viền để resize."
                      : "Đã đạt tối đa 3 vùng. Xoá vùng hiện có để tạo mới."
                    : "Chế độ giám sát đang bật. Bật Edit Mode để thay đổi vùng."}
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT: Log Panel */}
          <section className="lg:col-span-2 flex flex-col gap-3 sm:gap-4 min-h-0">
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30 cursor-pointer select-none shrink-0"
                onClick={() => setLogCollapsed(!logCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">WS Log Stream</h2>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {logs.length} / 100 messages · {validTargetLogs} valid events
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    Auto-scroll
                  </label>
                  <Button
                    onClick={(e) => { e.stopPropagation(); clearLogs() }}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1.5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                  {logCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {!logCollapsed && (
                <div
                  ref={logContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto bg-slate-950 dark:bg-black p-3 font-mono text-[11px] leading-relaxed space-y-0.5"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      <div className="text-center">
                        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30 animate-pulse" />
                        <p>Chưa có dữ liệu WebSocket...</p>
                        <p className="text-[10px] mt-1 text-slate-600">Vui lòng kiểm tra kết nối ESP32</p>
                      </div>
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <LogRow key={`${log.timestamp}-${index}`} log={log} />
                    ))
                  )}
                </div>
              )}

              {logCollapsed && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  <ScrollText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Log panel đã thu gọn. Nhấn để mở rộng.
                </div>
              )}

              <div className="sm:hidden px-3 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  Auto-scroll
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {logs.length} msgs
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'purple' | 'indigo' | 'emerald'
}) {
  const colorMap = {
    purple: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/20',
    indigo: 'from-indigo-500/15 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  }
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colorMap[color]} p-2.5 sm:p-4 shadow-sm`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg sm:text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function LogRow({ log }: { log: WsLogEntry }) {
  const targets = log.parsedData?.targets ?? []
  const validTargets = targets.filter(t => t.valid === 1)
  const hasValid = validTargets.length > 0

  return (
    <div
      className={`group break-all rounded px-1.5 py-0.5 hover:bg-slate-800/60 transition-colors ${
        hasValid ? '' : 'opacity-50'
      }`}
    >
      <span className="text-amber-400/90">{log.timestamp}</span>
      <span className="mx-1 text-slate-600">›</span>
      <span className="text-slate-300">{log.rawMessage}</span>
      {hasValid && (
        <div className="mt-0.5 ml-2 flex flex-wrap gap-1.5 text-[9px]">
          {validTargets.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded px-1.5 py-px bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold"
            >
              T{t.id}
              <span className="text-emerald-500/70">({t.x},{t.y})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
