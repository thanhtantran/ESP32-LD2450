# Zone Presence Detection System with HLK-LD2450 Radar

> 🌐 **Đọc tài liệu bằng Tiếng Việt:** [README.md](README.md)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)
![ESP32](https://img.shields.io/badge/ESP32-Ready-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![React](https://img.shields.io/badge/React-18-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

![Screenshot of the LD2450 Detection App dashboard](/ui.png)

Hệ thống phát hiện vùng có mặt người **end-to-end** dùng cảm biến radar mmWave **HLK-LD2450** 24GHz, điều khiển bởi **ESP32**, kết hợp giao diện điều khiển Web hiện đại chạy trên **Orange Pi Server** (Next.js 14 + React 18 + Tailwind). Theo dõi vị trí lên đến 3 người cùng lúc, cấu hình vùng phát hiện kéo-thả, luồng log WebSocket realtime và hỗ trợ giao diện tối/sáng responsive.

---

## 📋 Table of Contents

- [Overview](#-overview)
  - [1. ESP32 Firmware (`esp32-ld2450/`)](#1-esp32-firmware-esp32-ld2450)
  - [2. Orange Pi Web Server (`OrangePi-Server/`)](#2-orange-pi-web-server-orangepi-server)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Hardware Setup](#-hardware-setup)
- [Installation](#-installation)
  - [Step 1 — Flash ESP32 Firmware](#step-1--flash-esp32-firmware)
  - [Step 2 — Run Orange Pi Server](#step-2--run-orange-pi-server)
- [Usage Guide](#-usage-guide)
- [Technical Specifications](#-technical-specifications)
- [Project Structure](#-project-structure)
- [WebSocket Payload Contract](#-websocket-payload-contract)
- [API Endpoints](#-api-endpoints)
- [Dashboard Layout (Responsive)](#-dashboard-layout-responsive)
- [Credits & License](#-credits--license)

---

## 🌐 Overview

Dự án được chia thành **2 module độc lập, tương tác qua mạng LAN**:

### 1. ESP32 Firmware (`esp32-ld2450/`)
- Đọc dữ liệu Serial từ cảm biến HLK-LD2450
- Kiểm tra hợp lệ, tính toán sự hiện diện trong vùng
- Host **WebSocket server** phát tọa độ thời gian thực (20Hz)
- Host **REST API** GET/POST cấu hình vùng lưu trên ESP32

### 2. Orange Pi Web Server (`OrangePi-Server/`)
- Ứng dụng Next.js 14 (App Router) + React 18 + TypeScript
- Làm **API proxy** → chuyển tiếp request `/api/zones` về ESP32 (giảm tải cho thiết bị)
- Bảng điều khiển Web:
  - Radar 2D trực tiếp 8m × 6m
  - Công cụ kéo-thả tạo / sửa / xoá vùng
  - Luồng log WebSocket kiểu terminal
  - Dark / Light mode, responsive

---

## ✨ Key Features

### Radar Capabilities (ESP32)
- Công nghệ radar mmWave 24GHz **không dùng camera**, không xâm phạm PR
- Theo dõi **đến 3 mục tiêu** đồng thời, tần số 20Hz
- Phạm vi: 6m về trước, ±4m ngang (tổng 8m)
- Độ chính xác cấp mm
- Tự động lọc các slot trống (`valid = 0`)

### Web Dashboard (Orange Pi Server)
- **Radar View** 2D real-time + badge EDITING / MONITORING
- **Tối đa 3 vùng** kéo / resize / xoá trực quan
- **WS Log Stream** cố định chiều cao = Radar (desktop), kèm badge `T1(x,y)`
- **Chế độ Tối / Sáng** 1 click, lưu `localStorage`, không FOUC
- **Responsive 100%:**
  - Desktop (≥1024px): Radar 3/5 trái, Log 2/5 phải
  - Mobile (<1024px): Stack Radar trên, Log dưới
- Hỗ trợ **nhiều ESP32** (lưu nhiều IP + chuyển đổi nhanh)
- Stat cards: Số người đang phát hiện · Vùng hoạt động · Sự kiện / tin nhắn

---

## 🏗 System Architecture

### Hardware Layer
| Thiết bị | Vai trò | Giao tiếp |
|---|---|---|
| HLK-LD2450 | Thu thập vị trí người 24GHz | Serial (UART) 256k baud |
| ESP32-WROOM | Xử lý dữ liệu, WS + REST server | WiFi LAN, GPIO 16/17 UART2 |
| Orange Pi / Any Linux | Host Next.js Web App | LAN / WLAN → ESP32 |

### Software Layer
- **ESP32 Firmware (C++ / Arduino):** FreeRTOS tasks, WebSocketsServer, ArduinoJson, zone polygon/range check
- **Server (TypeScript / Next.js 14):** Route handler `/api/zones` làm HTTP proxy về ESP32
- **Client (React 18 + Tailwind):** useWebSocket hook, ResizeObserver, drag-resize zones

### Data Flow
```
  HLK-LD2450 (Serial) → ESP32 (parse + zone check)
        ↓ WebSocket (port 81)
  Orange Pi → Next.js → useWebSocket hook
        ↓ setState
  Radar View + Zone Overlay + Log Panel (realtime)
```

---

## 🔧 Hardware Setup

### Bill of Materials
- HLK-LD2450 24GHz radar module
- ESP32-WROOM-32 dev board
- USB-C 5V 2A adapter
- 4× Dupont jumper (female-to-female)
- Optional: 3D printed enclosure

### Wiring
```
HLK-LD2450   →   ESP32-WROOM
────────────────────────────────
       5V    →    5V / VIN
      GND    →    GND
       TX    →    GPIO16  (UART2 RX)
       RX    →    GPIO17  (UART2 TX)
```

### Mounting
- Độ cao: **1.2–1.5 m** trên sàn
- Hướng mặt cảm biến về vùng cần giám sát
- Tránh chướng ngại vật kim loại trước mặt radar
- Cách ăng-ten WiFi ≥ 30 cm

---

## ⚙️ Installation

Yêu cầu:
- Arduino IDE 2.x (cho ESP32)
- Node.js ≥ 16, npm ≥ 8 (cho Orange Pi Server)

### Step 1 — Flash ESP32 Firmware

1. Clone repo:
   ```bash
   git clone https://github.com/thanhtantran/ESP32-LD2450.git
   cd ESP32-LD2450
   ```
2. Mở Arduino IDE → Cài các thư viện cần thiết: `HLK-LD2450` (manager)
3. Mở file `esp32-ld2450/esp32-ld2450.ino`
4. Tạo file `WiFiCredentials.h` cùng thư mục:
   ```cpp
   #define WIFI_SSID     "your_wifi_name"
   #define WIFI_PASSWORD "your_wifi_pass"
   ```
5. Board: `ESP32 Dev Module`, Port: cổng USB COM
6. **Upload** vào ESP32. Mở Serial Monitor (115200 baud), chờ dòng `WiFi connected. IP: 192.168.x.y` → **copy IP này**.

### Step 2 — Run Orange Pi Server

1. Đi vào thư mục web server:
   ```bash
   cd OrangePi-Server/
   ```
2. Cài dependencies:
   ```bash
   npm install
   ```
3. *(Tùy chọn)* Đặt IP ESP32 mặc định — chỉnh file `config/index.ts`:
   ```ts
   const DEFAULT_ESP32_IP = '192.168.88.95'   // thay bằng IP copy ở Step 1
   ```
4. Khởi động dev server:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt → [http://localhost:3000](http://localhost:3000)

#### Production build
```bash
npm run build
npm run start
```

---

## 🎯 Usage Guide

### 1. First-time setup
- Bật ESP32 → kiểm tra Serial Monitor lấy IP
- Mở Dashboard, dán IP ESP32 vào ô `ESP32 IP Address` → **Connect**
- Sau khi kết nối WS, các target xuất hiện trên Radar ngay

### 2. Create / Edit / Delete Zones
1. Tắt **Monitor Mode** → chuyển sang chế độ **Edit Mode**
2. Nhấn **New Zone** → tạo zone chữ nhật 2×2m mặc định
3. Kéo di chuyển vị trí, dùng 4 góc / 4 cạnh để **resize**
4. Nhấn nút **🗑 Delete** trên góc zone để xóa
5. Tắt Edit Mode → cấu hình được **POST** về ESP32 `/updateZones` và lưu

### 3. Realtime Monitoring
- Theo dõi vị trí từng người (T1 / T2 / T3) trên Radar
- Đọc dòng log WS thô ở panel bên phải (badge `T1(x,y)` cho các target hợp lệ)
- Theo dõi badge màu xanh lá `MONITORING` / vàng `EDITING`

---

## 🔍 Technical Specifications

### Radar (HLK-LD2450)
| Parameter | Value |
|---|---|
| Frequency | 24 GHz ISM |
| Max range | 6 m |
| Horizontal range | ±4 m (tổng 8 m) |
| Refresh rate | 20 Hz |
| Position resolution | 1 mm |
| Field of view (H×V) | ~120° × ~60° |
| Serial baud rate | 256000 |

### Zone Configuration
| Parameter | Range |
|---|---|
| Max zones | 3 |
| X-axis | −4000 mm → +4000 mm |
| Y-axis | 1 mm → 6000 mm |
| Min zone size | 20 × 20 mm |
| Max zone size | 8000 × 6000 mm |

---

## 📁 Project Structure

```
ESP32-LD2450/
├── README-en.md              # English docs (this file)
├── README.md                 # Vietnamese docs
├── LICENSE
├── ui.png                    # Screenshot
│
├── esp32-ld2450/             # ================= PHẦN 1: ESP32 FIRMWARE ================
│   └── esp32-ld2450.ino      # Sketch chính (WiFi + WS server + zone + serial parser)
│         (WiFiCredentials.h  # *tạo thủ công* - WIFI_SSID / WIFI_PASSWORD)
│
└── OrangePi-Server/          # =============== PHẦN 2: ORANGE PI WEB ================
    ├── app/
    │   ├── api/zones/route.ts   # Proxy route: Next.js → ESP32 /zones & /updateZones
    │   ├── fonts/               # Geist Sans / Geist Mono
    │   ├── globals.css          # Tailwind + dark/light CSS vars
    │   ├── layout.tsx           # Root + ThemeProvider (no FOUC script)
    │   └── page.tsx
    ├── components/
    │   ├── ui/                  # shadcn/ui (Button, Input, Select, Switch, Label)
    │   ├── AnimatedWifiSignal.tsx
    │   ├── DetectedPoints.tsx
    │   ├── Footer.tsx           # Credits: Tony Trần + Orange Pi VN
    │   ├── InteractiveRoom.tsx  # MAIN DASHBOARD
    │   ├── MoveableResizableZone.tsx
    │   ├── ThemeProvider.tsx    # Dark/Light context
    │   └── ThemeToggle.tsx
    ├── config/index.ts          # DEFAULT_ESP32_IP, room coords, zone limits
    ├── hooks/useWebSocket.ts    # WS client + targets[] parser + 100-msg log buffer
    ├── lib/utils.ts
    ├── types/index.ts           # Zone, Point, Target, WsMessage, WsLogEntry
    ├── utils/coordinates.ts     # Linear mm ↔ px mapper
    └── package.json
```

---

## 📡 WebSocket Payload Contract

ESP32 broadcast JSON liên tục (~20Hz):

```jsonc
{
  "targets": [
    { "id": 1, "x": 1788, "y": 2091, "valid": 1 },  // ✅ Người thật
    { "id": 2, "x": -32768, "y": -32768, "valid": 0 }, // ❌ Slot trống — bỏ qua
    { "id": 3, "x": -32768, "y": -32768, "valid": 0 }  // ❌ Slot trống — bỏ qua
  ]
}
```

| Trường | Đơn vị | Range | Mô tả |
|---|---|---|---|
| `id`    | —   | 1..3  | Số thứ tự target |
| `x`     | mm  | ±4000 | Ngang (0 = trung tâm) |
| `y`     | mm  | 1..6000 | Dọc về phía trước (0 = sát radar) |
| `valid` | bit | 0/1   | 1 = hợp lệ, 0 = bỏ qua |

---

## 🚏 API Endpoints

### ESP32 (gốc — gọi từ Orange Pi):
```
GET  http://<ESP32_IP>/zones
POST http://<ESP32_IP>/updateZones      body: { zones: [{x1,y1,x2,y2}, ...] }
WS   ws://<ESP32_IP>/ws                 stream targets[]
```

### Orange Pi Server (proxy — gọi từ trình duyệt client):
```
GET  /api/zones                         ← x-esp32-ip header
POST /api/zones                         body: { zones: [...] }
```

---

## 🖼 Dashboard Layout (Responsive)

### Desktop (≥ 1024px)
```
┌──────────────────────────────────────────────────────────────────┐
│ Header: 🛡️ LD2450 Detection App    ESP32 IP pill    🌙/☀️ Toggle │
├──────────────────────────────────────────────────────────────────┤
│ [ ESP32 IP + Multi-device ]    [ ⬜ Monitor Mode / ✎ Edit Mode ] │
├───────────────────────────────────┬──────────────────────────────┤
│ 👥 Detected │ 🟦 Zones │ 🟢 Events│                              │
├───────────────────────────────────┤                              │
│                                   │   WS LOG STREAM              │
│     RADAR VIEW (3/5 width)        │   ┌────────────────────┐     │
│     ┌────────────────────────┐    │   │ [ts] {json}         │     │
│     │    📡       T1         │    │   │ [ts] {json}         │     │
│     │            T2 ·        │    │   │ T1(1788, 2091)      │     │
│     └────────────────────────┘    │   └────────────────────┘     │
│                                   │                              │
├───────────────────────────────────┴──────────────────────────────┤
│ Footer: Made with ❤ by Tony Trần · © 2026 · Orange Pi Việt Nam   │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (<1024px) — stacked
`Header → Controls → 3 Stat cards → Radar View → WS Log Stream → Footer`

---

## 👥 Credits & License

### Credits
- **Được tạo ra với ❤ bởi [Tony Trần](https://tony.id.vn)**
- Hợp tác cùng **[Orange Pi Việt Nam](https://orangepi.vn)**
- Dựa trên kho mã gốc: [nick28s/IoTProject-ZonePresenceDetection-LD2450](https://github.com/nick28s/IoTProject-ZonePresenceDetection-LD2450/)

### License
© 2026 — Cùng loại giấy phép với kho gốc. Chi tiết xem file [LICENSE](LICENSE) (GPL v3+).
