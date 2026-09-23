# LD2450 Detection App

> 🌐 **Đọc tài liệu bằng Tiếng Việt:** [README.md](README.md)

A modern, responsive Web dashboard for monitoring **HLK-LD2450 mmWave Human Presence Radar** via ESP32. Visualize real-time target positions, configure detection zones, and stream raw WebSocket logs — all in one elegant interface.

Built with **Next.js 14 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

![UI Screenshot](/ui.png)

---

## ✨ Features

### 🎯 Core Features
- **Real-time Radar Visualization** — Live 2D plot (8m × 6m detection area) showing all valid human targets detected by the LD2450 sensor
- **Up to 3 Configurable Zones** — Create, drag, resize, and delete rectangular detection zones. Changes are synced back to ESP32 instantly
- **WebSocket Log Stream** — Terminal-style panel showing raw WS messages with timestamps (`[YYYY-MM-DD HH:MM:SS] {json}`) with per-target badges for valid detections
- **Multi-ESP32 Support** — Save & switch between multiple ESP32 IP addresses. Custom IP input with validation

### 🎨 UI / UX
- **Dark / Light Mode** — Toggle with one click. Auto-detects system preference on first visit. Persisted in `localStorage`. Zero FOUC via inline theme script
- **Responsive Layout**
  - **Desktop (≥1024px):** 5-column grid → Radar View (3/5) left, Log Panel (2/5) right, side-by-side
  - **Mobile (<1024px):** Stacked → Radar View on top, Log Panel below
- **Live Stats Cards** — Detected persons count · Active zones · Valid WS events / total messages
- **Status Indicators** — Connection badge (Connected/Disconnected), Edit Mode pill (EDITING/MONITORING)
- **Gradient Theme** — Indigo → Purple → Pink gradient branding with glow effects on radar & icons
- **Collapsible Log Panel** — Click the log header to collapse/expand (saves vertical space on mobile)

### 🔧 Developer Quality
- Full TypeScript strict typing for all WS payloads, zones, points, and UI state
- WebSocket parser correctly handles the real ESP32 WS format:
  ```json
  {"targets":[{"id":1,"x":1788,"y":2091,"valid":1},{"id":2,"x":-32768,"y":-32768,"valid":0}]}
  ```
- Invalid targets (valid=0, typically x/y = -32768) are filtered out automatically
- Log buffer capped at 100 messages to prevent memory leaks
- ResizeObserver-friendly radar area with responsive aspect ratios

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your default ESP32 IP (optional)
#    Edit OrangePi-Server/config/index.ts:
#    const DEFAULT_ESP32_IP = '192.168.88.95'

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🏗️ Project Structure

```
OrangePi-Server/
├── app/
│   ├── api/zones/route.ts    # Proxy → ESP32 REST API (GET/POST zones)
│   ├── fonts/                # Geist Sans / Geist Mono (next/font)
│   ├── globals.css           # Tailwind layers + CSS vars (light/dark)
│   ├── layout.tsx            # Root layout, ThemeProvider, anti-FOUC script
│   └── page.tsx              # Landing page metadata
├── components/
│   ├── ui/                   # shadcn/ui primitives (Button, Input, Select, Switch, Label)
│   ├── AnimatedWifiSignal.tsx# Animated WiFi radar icon at origin
│   ├── DetectedPoints.tsx    # Colored user-point markers on radar
│   ├── Footer.tsx            # Credits footer (Tony Trần · Orange Pi VN)
│   ├── InteractiveRoom.tsx   # MAIN DASHBOARD — Header/Stats/Radar/Log grid
│   ├── MoveableResizableZone.tsx  # Draggable & resizable zone overlay
│   ├── ThemeProvider.tsx     # Dark/light context + localStorage persist
│   └── ThemeToggle.tsx       # Sun/Moon toggle button
├── config/index.ts           # Default ESP32 IP, room coords, zone limits
├── hooks/useWebSocket.ts     # WS client, targets parser, log buffer (100)
├── lib/utils.ts              # cn() classnames helper
├── types/index.ts            # Zone, Point, Target, WsMessage, WsLogEntry
└── utils/coordinates.ts      # Linear coord mapper (mm ↔ px)
```

---

## 📡 WebSocket Payload Contract

The ESP32 must broadcast JSON frames with this shape:

```jsonc
{
  "targets": [
    { "id": 1, "x": 1788, "y": 2091, "valid": 1 },  // Valid target
    { "id": 2, "x": -32768, "y": -32768, "valid": 0 }, // Empty slot (ignored)
    { "id": 3, "x": -32768, "y": -32768, "valid": 0 }
  ]
}
```

| Field | Unit / Range | Description |
|---|---|---|
| `x` | mm, `[-4000, 4000]` | Horizontal position relative to sensor (center) |
| `y` | mm, `[1, 6000]` | Distance in front of sensor (bottom of radar = 0) |
| `valid` | `0 \| 1` | `1` = real target, `0` = empty slot (skipped) |

---

## 🖼️ Dashboard Layout (Responsive)

### Desktop (lg: ≥ 1024px)
```
┌──────────────────────────────────────────────────────────────────┐
│  Header:  [Logo LD2450]  ESP32 IP pill  [ON/OFF]  ☀/🌙 toggle   │
├──────────────────────────────────────────────────────────────────┤
│  ESP32 selector & Edit Mode controls                             │
├──────────────────────────────────────────────────────────────────┤
│  Detected │ Zones │ Events   ← 3 stat cards                     │
├───────────────────────────────────────┬──────────────────────────┤
│                                       │                          │
│     RADAR VIEW (3/5 width)            │   WS LOG STREAM (2/5)   │
│     ┌──────────────────────────┐     │   ┌──────────────────┐  │
│     │    ·          T1        │     │   │ [ts] {json}       │  │
│     │                          │     │   │ [ts] {json}       │  │
│     │  📡  T2                  │     │   │ [ts] {json}       │  │
│     │                          │     │   │ T1(1788,2091)     │  │
│     └──────────────────────────┘     │   └──────────────────┘  │
│                                       │                          │
├───────────────────────────────────────┴──────────────────────────┤
│  Footer: Made with ❤ by Tony Trần · © 2026 · Orange Pi VN        │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (< 1024px)
Same content, stacked vertically: **Header → Controls → Stats → Radar → Logs → Footer**

---

## ⚙️ Configuration

Edit `config/index.ts` to tune defaults:

```ts
const DEFAULT_ESP32_IP = '192.168.88.95'

zones: {
  maxCount: 3,      // Max zones (UI prevents exceeding)
  defaultSize: 2000,// Initial zone size in mm
  minSize: 20,      // Minimum zone size in mm
},
room: {
  coordinates: {
    minX: -4000, maxX: 4000,  // 8m horizontal total
    minY: 1,     maxY: 6000,  // 6m forward distance
  }
}
```

---

## 👥 Credits & License

- **Crafted with ❤ by [Tony Trần](https://tony.id.vn)**
- In collaboration with **[Orange Pi Việt Nam](https://orangepi.vn)**
- Copyright © 2026

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [HLK-LD2450 Datasheet](https://www.hlktech.com/en/Product/118.html)
