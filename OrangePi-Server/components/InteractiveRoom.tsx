'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MoveableResizableZone } from './MoveableResizableZone'
import { AnimatedWifiSignal } from './AnimatedWifiSignal'
import { DetectedPoints } from './DetectedPoints'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Zone } from '@/types'
import { mapCoordinate } from '@/utils/coordinates'
import { getConfig } from '@/config'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Trash2 } from 'lucide-react' // Add this import

export function InteractiveRoomEsp32() {
  const [mounted, setMounted] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentIp, setCurrentIp] = useState(getConfig().esp32.defaultIp)
  const [customIp, setCustomIp] = useState('')
  const [savedIps, setSavedIps] = useState<string[]>([])  // Initialize empty

  // Handle initial mount and localStorage load
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('savedIps')
    if (saved) {
      const parsedIps = JSON.parse(saved)
      setSavedIps(parsedIps)
      // Set current IP to first saved IP if available
      if (parsedIps.length > 0) {
        setCurrentIp(parsedIps[0])
      }
    } else {
      // Initialize with default IP if no saved IPs
      const defaultIp = getConfig().esp32.defaultIp
      setSavedIps([defaultIp])
      setCurrentIp(defaultIp)
      localStorage.setItem('savedIps', JSON.stringify([defaultIp]))
    }
  }, [])

  // Update localStorage whenever savedIps changes
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
  
  const { points, logs, clearLogs } = useWebSocket(config.esp32.webSocketUrl)
  const [showLogs, setShowLogs] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
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
    // Remove all event handlers, just handle the deletion
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

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/zones', {
          headers: { 'x-esp32-ip': currentIp }
        })
        if (response.ok) {
          const data = await response.json()
          setZones(data.map((zone: Zone, index: number) => ({
            ...zone,
            id: index + 1, // Assign IDs 1, 2, 3
            color: colors[index % colors.length],
          })))
          setConnectionStatus('connected')
        } else {
          throw new Error('Connection failed')
        }
      } catch (error) {
        console.error('Failed to fetch zones:', error)
        setZones([]) // Clear zones on connection failure
        setConnectionStatus('disconnected')
      }
    }

    fetchZones()
  }, [currentIp])

  const createNewZone = () => {
    if (roomRef.current && zones.length < 3) {
      const rect = roomRef.current.getBoundingClientRect()
      const x1 = Math.max(-4000, Math.min(4000, Math.round(mapCoordinate(rect.width / 2, 0, roomSize.width, -4000, 4000))))
      const y1 = Math.max(1, Math.min(6000, Math.round(mapCoordinate(rect.height / 2, 0, roomSize.height, 1, 6000))))
      const x2 = Math.max(-4000, Math.min(4000, x1 + 2000))
      const y2 = Math.min(6000, Math.max(1, y1 + 2000))
      const color = colors[zones.length % colors.length]
      const newZone = { id: zones.length + 1, x1, y1, x2, y2, color } // Assign new ID
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

  return (
    <div className="select-none flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">LD2450 Detection App</h1>
      
      <div className="flex items-center space-x-2 mb-4">
        {currentIp === 'custom' ? (
          <form onSubmit={handleCustomIpSubmit} className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter IP address"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              pattern="^(\d{1,3}\.){3}\d{1,3}$"
              className="w-36"
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
          <Select value={currentIp} onValueChange={handleIpChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select IP" />
            </SelectTrigger>
            <SelectContent>
              {savedIps.map(ip => (
                <div key={ip} className="flex items-center justify-between px-2 py-1 hover:bg-accent">
                  <SelectItem value={ip} className="flex-1">
                    {ip}
                  </SelectItem>
                  <button
                    type="button"
                    onClick={() => handleDeleteIp(ip)}
                    className="p-1 hover:text-red-500 focus:outline-none ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <SelectItem value="custom">Add Custom IP</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className={`ml-2 h-3 w-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600">
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="flex items-center space-x-2 mb-4">
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
        <Label htmlFor="edit-mode">Edit Mode</Label>
      </div>
      <div 
        ref={roomRef}
        className={`w-full max-w-2xl h-96 bg-white border-2 border-gray-300 relative ${isEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
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

        {connectionStatus === 'connected' && (
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
      </div>
      <p className="mt-4 text-sm text-gray-600">
        {isEditMode
          ? zones.length < 3
            ? "Click 'New Zone' to create zones (max 3). Drag to move, resize from corner."
            : "Maximum number of zones reached. Delete a zone to create a new one."
          : "Edit mode is off. Toggle edit mode to make changes."}
      </p>
      <div className="flex space-x-2 min-h-[5rem] items-center">
      {isEditMode && (
        <>
        <Button onClick={createNewZone} className="mt-4">
            New Zone
        </Button>
        <Button onClick={resetZones} className="mt-4">
            Reset Zones
        </Button></>
      )}
        <Button
          onClick={() => setShowLogs(!showLogs)}
          variant="outline"
          className="mt-4"
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'} ({logs.length})
        </Button>
      </div>

      {showLogs && (
        <div className="w-full max-w-4xl mt-4 bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <span className="text-green-400 text-sm font-mono font-bold">WS Log Stream</span>
              <span className="text-gray-400 text-xs font-mono">
                {logs.length} / 100 messages
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-gray-300 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3"
                />
                <span>Auto-scroll</span>
              </label>
              <Button
                onClick={clearLogs}
                size="sm"
                variant="destructive"
                className="h-7 px-3 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="h-80 overflow-y-auto font-mono text-xs p-3 space-y-1"
            style={{ scrollBehavior: autoScroll ? 'auto' : 'smooth' }}
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No WebSocket messages received yet...
              </div>
            ) : (
              logs.map((log, index) => {
                const validCount = log.parsedData?.targets
                  ? log.parsedData.targets.filter((t) => t.valid === 1).length
                  : 0
                return (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className={`${
                      validCount > 0
                        ? 'text-green-300'
                        : 'text-gray-500'
                    } leading-relaxed break-all hover:bg-gray-800 px-1 py-0.5 rounded`}
                  >
                    <span className="text-yellow-500">{log.timestamp}</span>
                    <span className="text-gray-400"> </span>
                    <span>{log.rawMessage}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
