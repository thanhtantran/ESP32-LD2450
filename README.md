# Hệ thống Phát hiện Vùng có người dùng Radar HLK-LD2450

> 🌐 **Read this document in English:** [README-en.md](README-en.md)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)
![ESP32](https://img.shields.io/badge/ESP32-Ready-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![React](https://img.shields.io/badge/React-18-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

![Ảnh chụp màn hình Dashboard LD2450 Detection App](/ui.png)

Hệ thống phát hiện vùng có mặt người **end-to-end** dùng cảm biến radar mmWave **HLK-LD2450** 24GHz, điều khiển bởi **ESP32**, kết hợp giao diện điều khiển Web hiện đại chạy trên **Orange Pi Server** (Next.js 14 + React 18 + Tailwind). Theo dõi vị trí lên đến 3 người cùng lúc, cấu hình vùng phát hiện kéo-thả, luồng log WebSocket realtime và hỗ trợ giao diện tối/sáng responsive.

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
  - [1. ESP32 Firmware (`esp32-ld2450/`)](#1-esp32-firmware-esp32-ld2450)
  - [2. Orange Pi Web Server (`OrangePi-Server/`)](#2-orange-pi-web-server-orangepi-server)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc Hệ thống](#-kiến-trúc-hệ-thống)
- [Thiết lập Phần cứng](#-thiết-lập-phần-cứng)
- [Cài đặt](#-cài-đặt)
  - [Bước 1 — Nạp Firmware cho ESP32](#bước-1--nạp-firmware-cho-esp32)
  - [Bước 2 — Chạy Orange Pi Server](#bước-2--chạy-orange-pi-server)
- [Hướng dẫn Sử dụng](#-hướng-dẫn-sử-dụng)
- [Thông số Kỹ thuật](#-thông-số-kỹ-thuật)
- [Cấu trúc Dự án](#-cấu-trúc-dự-án)
- [Thỏa thuận Payload WebSocket](#-thỏa-ước-payload-websocket)
- [Các Endpoint API](#-các-endpoint-api)
- [Bố cục Dashboard (Responsive)](#-bố-cục-dashboard-responsive)
- [Góp công & Bản quyền](#-góp-công--bản-quyền)

---

## 🌐 Tổng quan

Dự án được chia thành **2 module độc lập, tương tác với nhau qua mạng LAN**:

### 1. ESP32 Firmware (`esp32-ld2450/`)
- Đọc luồng dữ liệu Serial từ cảm biến HLK-LD2450
- Kiểm tra hợp lệ dữ liệu, tính toán sự hiện diện trong vùng
- Host **WebSocket server** phát tọa độ mục tiêu thời gian thực (20Hz)
- Host **REST API** GET/POST cấu hình vùng, lưu trong ESP32

### 2. Orange Pi Web Server (`OrangePi-Server/`)
- Ứng dụng Next.js 14 (App Router) + React 18 + TypeScript
- Làm **API proxy** → chuyển tiếp request `/api/zones` về ESP32 (giảm tải cho thiết bị IoT)
- Bảng điều khiển Web:
  - Radar 2D trực tiếp vùng 8m × 6m
  - Công cụ kéo-thả tạo / sửa / xoá vùng
  - Luồng log WebSocket kiểu terminal
  - Hỗ trợ Dark / Light mode, responsive mọi thiết bị

---

## ✨ Tính năng chính

### Khả năng Radar (ESP32)
- Công nghệ radar mmWave 24GHz **không dùng camera**, không xâm phạm PR cá nhân
- Theo dõi **đến 3 mục tiêu người** cùng lúc, tần số 20Hz
- Phạm vi: 6m về phía trước, ±4m theo phương ngang (tổng 8m)
- Độ chính xác vị trí cấp milimét
- Tự động lọc các slot trống (`valid = 0`, thường có x/y = -32768)

### Web Dashboard (Orange Pi Server)
- **Radar View** 2D realtime kèm badge trạng thái EDITING / MONITORING
- **Tối đa 3 vùng** có thể kéo / resize / xoá trực quan ngay trên giao diện
- **WS Log Stream** cố định chiều cao = Radar (desktop), có badge `T1(x,y)` cho các target hợp lệ
- **Chế độ Tối / Sáng** 1 cú nhấp, lưu vào `localStorage`, không có hiệu ứng nháy sáng (FOUC)
- **100% Responsive:**
  - Desktop (≥1024px): Radar chiếm 3/5 bên trái, Log 2/5 bên phải
  - Mobile (<1024px): Xếp chồng Radar ở trên, Log ở dưới
- Hỗ trợ **nhiều ESP32** (lưu nhiều IP + chuyển đổi nhanh từ dropdown)
- Thẻ thống kê: Số người đang phát hiện · Số vùng hoạt động · Sự kiện hợp lệ / tổng tin nhắn

---

## 🏗 Kiến trúc Hệ thống

### Lớp Phần cứng
| Thiết bị | Vai trò | Giao tiếp |
|---|---|---|
| HLK-LD2450 | Thu thập vị trí người bằng sóng 24GHz | Serial (UART) 256k baud |
| ESP32-WROOM | Xử lý dữ liệu, WS + REST server | WiFi LAN, GPIO 16/17 UART2 |
| Orange Pi / Any Linux box | Host ứng dụng Next.js Web UI | LAN / WLAN → ESP32 |

### Lớp Phần mềm
- **ESP32 Firmware (C++ / Arduino):** Task FreeRTOS, WebSocketsServer, ArduinoJson, kiểm tra vùng (rect inside/range)
- **Server (TypeScript / Next.js 14):** Route handler `/api/zones` làm HTTP proxy tới ESP32
- **Client (React 18 + Tailwind CSS):** Hook `useWebSocket`, ResizeObserver đồng bộ chiều cao Radar & Log, drag-resize zones

### Luồng Dữ liệu tổng thể
```
  HLK-LD2450 (UART2 Serial) → ESP32 (parse payloads + zone check)
        ↓ WebSocket (cổng 81, JSON frames ~20Hz)
  Orange Pi Next.js Server → Client useWebSocket hook
        ↓ setState React 18
  Radar View + Zone Overlay + WS Log Panel (cập nhật realtime)
```

---

## 🔧 Thiết lập Phần cứng

### Danh mục Linh kiện
- Module radar 24GHz HLK-LD2450
- Board phát triển ESP32-WROOM-32
- Nguồn USB-C 5V 2A
- 4 dây nhảy Dupont cái-cái
- Tùy chọn: Vỏ bảo vệ in 3D

### Sơ đồ Nối dây
```
HLK-LD2450   →   ESP32-WROOM
────────────────────────────────
       5V    →    5V / VIN
      GND    →    GND
       TX    →    GPIO16  (UART2 RX)
       RX    →    GPIO17  (UART2 TX)
```

### Khuyến nghị Lắp đặt
- Độ cao: **1,2–1,5 m** tính từ sàn
- Mặt trước cảm biến hướng thẳng về vùng cần giám sát
- Tránh vật cản kim loại ngay trước mặt radar
- Cách ăng-ten WiFi các thiết bị khác ≥ 30 cm

---

## ⚙️ Cài đặt

Yêu cầu hệ thống:
- Arduino IDE 2.x (để nạp ESP32)
- Node.js ≥ 16, npm ≥ 8 (để chạy Orange Pi Server)

### Bước 1 — Nạp Firmware cho ESP32

1. Clone repository:
   ```bash
   git clone https://github.com/thanhtantran/ESP32-LD2450.git
   cd ESP32-LD2450
   ```
2. Mở Arduino IDE → vào Library Manager → cài thư viện `HLK-LD2450`
3. Mở file `esp32-ld2450/esp32-ld2450.ino`
4. Tạo file `WiFiCredentials.h` trong **cùng thư mục** `esp32-ld2450/`:
   ```cpp
   #define WIFI_SSID     "ten_wifi_cua_ban"
   #define WIFI_PASSWORD "mat_khau_wifi"
   ```
5. Board target chọn `ESP32 Dev Module`, Port chọn cổng COM USB tương ứng
6. Nhấn **Upload** → chờ nạp xong. Mở Serial Monitor (baud 115200), khi thấy dòng `WiFi connected. IP: 192.168.x.y` thì **sao chép IP này lại**.

### Bước 2 — Chạy Orange Pi Server

1. Di chuyển vào thư mục web server:
   ```bash
   cd OrangePi-Server/
   ```
2. Cài các gói phụ thuộc:
   ```bash
   npm install
   ```
3. *(Tùy chọn)* Đặt IP ESP32 mặc định — sửa file `config/index.ts`:
   ```ts
   const DEFAULT_ESP32_IP = '192.168.88.95'   // thay bằng IP vừa copy ở Bước 1
   ```
4. Khởi động development server:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt → truy cập [http://localhost:3000](http://localhost:3000)

#### Build Production
```bash
npm run build
npm run start
```

---

## 🎯 Hướng dẫn Sử dụng

### 1. Cài đặt lần đầu
- Cấp nguồn ESP32 → kiểm tra Serial Monitor, lấy IP ESP32
- Mở Dashboard, dán IP ESP32 vào ô `ESP32 IP Address` → **Connect**
- Sau khi WS handshake thành công, các mục tiêu người sẽ hiện lên Radar ngay lập tức

### 2. Tạo / Sửa / Xoá Vùng phát hiện
1. Tắt công tắc **Monitor Mode** → chuyển sang chế độ **Edit Mode**
2. Nhấn nút **New Zone** → vùng chữ nhật 2×2m mặc định được tạo
3. Kéo thả body zone để di chuyển vị trí; dùng 4 góc / 4 cạnh **handles** để resize
4. Nhấn nút **🗑 Delete** trên góc trái mỗi zone để xóa
5. Tắt Edit Mode → cấu hình mới được **POST** về ESP32 qua `/updateZones` và lưu

### 3. Giám sát Thời gian Thực
- Theo dõi vị trí từng người (T1 / T2 / T3) màu sắc trên Radar
- Đọc dòng log WS thô ở panel bên phải, có kèm badge `T1(x,y)` cho các target hợp lệ
- Theo dõi badge trạng thái màu xanh lá `MONITORING` / vàng `EDITING`

---

## 🔍 Thông số Kỹ thuật

### Radar (HLK-LD2450)
| Thông số | Giá trị |
|---|---|
| Tần số hoạt động | 24 GHz dải ISM |
| Phạm vi tối đa | 6 m (phía trước) |
| Phạm vi ngang | ±4 m (tổng 8 m) |
| Tốc độ cập nhật | 20 Hz |
| Độ phân giải vị trí | 1 mm |
| Trường nhìn (H×V) | ~120° × ~60° |
| Baud rate Serial | 256000 |

### Cấu hình Vùng
| Thông số | Khoảng giá trị |
|---|---|
| Số vùng tối đa | 3 |
| Trục X | −4000 mm → +4000 mm |
| Trục Y | 1 mm → 6000 mm |
| Kích thước vùng tối thiểu | 20 × 20 mm |
| Kích thước vùng tối đa | 8000 × 6000 mm |

---

## 📁 Cấu trúc Dự án

```
ESP32-LD2450/
├── README-en.md              # Tài liệu tiếng Anh
├── README.md                 # Tài liệu tiếng Việt (file này)
├── LICENSE
├── ui.png                    # Ảnh chụp màn hình dự án
│
├── esp32-ld2450/             # ================= PHẦN 1: ESP32 FIRMWARE ================
│   └── esp32-ld2450.ino      # Sketch chính: WiFi + WS server + zone logic + serial parser
│         (WiFiCredentials.h  # *TỰ TẠO BẰNG TAY*: chứa WIFI_SSID / WIFI_PASSWORD)
│
└── OrangePi-Server/          # =============== PHẦN 2: ORANGE PI WEB ================
    ├── app/
    │   ├── api/zones/route.ts   # Route proxy: Next.js → ESP32 /zones & /updateZones
    │   ├── fonts/               # Font Geist Sans / Geist Mono (next/font)
    │   ├── globals.css          # Tailwind layers + CSS vars tối/sáng
    │   ├── layout.tsx           # Root layout + ThemeProvider (chống FOUC script inline)
    │   └── page.tsx             # Page home + metadata
    ├── components/
    │   ├── ui/                  # Các nguyên tố shadcn/ui: Button, Input, Select, Switch, Label
    │   ├── AnimatedWifiSignal.tsx
    │   ├── DetectedPoints.tsx
    │   ├── Footer.tsx           # Footer credits: Tony Trần + Orange Pi Việt Nam
    │   ├── InteractiveRoom.tsx  # BẢNG ĐIỀU KHIỂN CHÍNH
    │   ├── MoveableResizableZone.tsx
    │   ├── ThemeProvider.tsx    # Context Dark/Light + localStorage persist
    │   └── ThemeToggle.tsx
    ├── config/index.ts          # DEFAULT_ESP32_IP, tọa độ phòng, giới hạn vùng
    ├── hooks/useWebSocket.ts    # WS client + parser targets[] + log buffer giới hạn 100 tin
    ├── lib/utils.ts             # cn() helper nối classnames
    ├── types/index.ts           # Zone, Point, Target, WsMessage, WsLogEntry
    ├── utils/coordinates.ts     # Bộ ánh xạ tọa độ tuyến tính mm ↔ px
    └── package.json
```

---

## 📡 Thỏa ước Payload WebSocket

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

| Trường | Đơn vị | Khoảng | Mô tả |
|---|---|---|---|
| `id`    | —    | 1..3     | Số thứ tự mục tiêu |
| `x`     | mm   | ±4000    | Phương ngang (0 = ngay giữa trục) |
| `y`     | mm   | 1..6000  | Phương dọc về phía trước (0 = sát cảm biến) |
| `valid` | bit  | 0/1      | 1 = hợp lệ, 0 = bỏ qua |

---

## 🚏 Các Endpoint API

### ESP32 (endpoint gốc — Orange Pi gọi tới):
```
GET  http://<IP_ESP32>/zones
POST http://<IP_ESP32>/updateZones      body: { zones: [{x1,y1,x2,y2}, ...] }
WS   ws://<IP_ESP32>/ws                 stream mảng targets[]
```

### Orange Pi Server (endpoint proxy — gọi từ trình duyệt client):
```
GET  /api/zones                         ← xác định IP ESP32 qua header x-esp32-ip
POST /api/zones                         body: { zones: [...] }
```

---

## 🖼 Bố cục Dashboard (Responsive)

### Desktop (≥ 1024px)
```
┌──────────────────────────────────────────────────────────────────┐
│ Header: 🛡️ LD2450 Detection App    ESP32 IP pill    🌙/☀️ Toggle │
├──────────────────────────────────────────────────────────────────┤
│ [ ESP32 IP + Multi-device ]    [ ⬜ Monitor Mode / ✎ Edit Mode ] │
├───────────────────────────────────┬──────────────────────────────┤
│ 👥 Đã phát hiện │ 🟦 Vùng │ 🟢 Events│                              │
├───────────────────────────────────┤                              │
│                                   │   WS LOG STREAM              │
│     RADAR VIEW (rộng 3/5)         │   ┌────────────────────┐     │
│     ┌────────────────────────┐    │   │ [ts] {json}         │     │
│     │    📡       T1         │    │   │ [ts] {json}         │     │
│     │            T2 ·        │    │   │ T1(1788, 2091)      │     │
│     └────────────────────────┘    │   └────────────────────┘     │
│                                   │                              │
├───────────────────────────────────┴──────────────────────────────┤
│ Footer: Made with ❤ by Tony Trần · © 2026 · Orange Pi Việt Nam   │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (<1024px) — xếp chồng
`Header → Controls → 3 thẻ thống kê → Radar View → WS Log Stream → Footer`

---

## 👥 Góp công & Bản quyền

### Góp công
- **Được tạo ra với ❤ bởi [Tony Trần](https://tony.id.vn)**
- Hợp tác cùng **[Orange Pi Việt Nam](https://orangepi.vn)**
- Dựa trên kho mã gốc: [nick28s/IoTProject-ZonePresenceDetection-LD2450](https://github.com/nick28s/IoTProject-ZonePresenceDetection-LD2450/)

### Bản quyền
© 2026 — Cùng loại giấy phép với kho gốc. Xem chi tiết tại file [LICENSE](LICENSE) (GPL v3+).
