# LD2450 Detection App

> 🌐 **Read this document in English:** [README-en.md](README-en.md)

Bảng điều khiển Web hiện đại, responsive để giám sát **Cảm biến radar mmWave phát hiện người HLK-LD2450** thông qua ESP32. Hiển thị vị trí mục tiêu theo thời gian thực, cấu hình vùng phát hiện, và luồng log WebSocket thô — tất cả trong cùng một giao diện thanh lịch.

Được xây dựng với **Next.js 14 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS** và **shadcn/ui**.

---

## ✨ Tính năng

### 🎯 Tính năng cốt lõi
- **Hiển thị Radar Thời gian Thực** — Biểu đồ 2D trực tiếp (vùng quét 8m × 6m) hiển thị toàn bộ mục tiêu người hợp lệ được cảm biến LD2450 phát hiện
- **Lên đến 3 vùng có thể cấu hình** — Tạo, kéo, thay đổi kích thước và xoá vùng phát hiện hình chữ nhật. Các thay đổi được đồng bộ về ESP32 tức thì
- **Luồng Log WebSocket** — Panel kiểu terminal hiển thị tin nhắn WS thô kèm dấu thời gian (`[YYYY-MM-DD HH:MM:SS] {json}`) và badge từng mục tiêu cho các phát hiện hợp lệ
- **Hỗ trợ nhiều ESP32** — Lưu & chuyển đổi giữa nhiều địa chỉ IP ESP32. Nhập IP tùy chỉnh kèm kiểm tra định dạng

### 🎨 Giao diện / Trải nghiệm người dùng
- **Chế độ Tối / Sáng** — Bật/tắt chỉ với 1 cú nhấp. Tự động nhận thiết lập hệ thống ở lần truy cập đầu. Lưu vào `localStorage`. Không có hiệu ứng nháy sáng (FOUC) nhờ script theme inline
- **Bố cục Responsive**
  - **Desktop (≥1024px):** Lưới 5 cột → Radar View (3/5) bên trái, Log Panel (2/5) bên phải, cạnh nhau
  - **Mobile (<1024px):** Xếp chồng → Radar View ở trên, Log Panel ở dưới
- **Thẻ Thống kê Trực tiếp** — Số người đang phát hiện · Vùng đang hoạt động · Sự kiện WS hợp lệ / tổng số tin nhắn
- **Chỉ báo Trạng thái** — Nhãn kết nối (Đã kết nối / Mất kết nối), Nhãn chế độ chỉnh sửa (ĐANG CHỈNH SỬA / ĐANG GIÁM SÁT)
- **Giao diện Gradient** — Nhận diện thương hiệu gradient Indigo → Tím → Hồng kèm hiệu ứng phát sáng trên radar & biểu tượng
- **Panel Log có thể thu gọn** — Nhấn vào tiêu đề log để thu gọn/mở rộng (tiết kiệm không gian dọc trên mobile)

### 🔧 Chất lượng dành cho Nhà phát triển
- Full TypeScript strict typing cho toàn bộ WS payload, vùng, điểm và state UI
- Bộ phân tích WebSocket xử lý đúng định dạng WS ESP32 thực tế:
  ```json
  {"targets":[{"id":1,"x":1788,"y":2091,"valid":1},{"id":2,"x":-32768,"y":-32768,"valid":0}]}
  ```
- Các mục tiêu không hợp lệ (valid=0, thường x/y = -32768) được tự động lọc bỏ
- Bộ đệm log giới hạn 100 tin nhắn để ngăn rò rỉ bộ nhớ
- Khu vực radar tương thích ResizeObserver với tỉ lệ khung hình responsive

---

## 🚀 Bắt đầu nhanh

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Thiết lập IP ESP32 mặc định (tùy chọn)
#    Mở file OrangePi-Server/config/index.ts:
#    const DEFAULT_ESP32_IP = '192.168.88.95'

# 3. Khởi động dev server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### Build Production

```bash
npm run build
npm run start
```

---

## 🏗️ Cấu trúc dự án

```
OrangePi-Server/
├── app/
│   ├── api/zones/route.ts    # Proxy → ESP32 REST API (GET/POST zones)
│   ├── fonts/                # Geist Sans / Geist Mono (next/font)
│   ├── globals.css           # Tailwind layers + CSS vars (sáng/tối)
│   ├── layout.tsx            # Root layout, ThemeProvider, script chống FOUC
│   └── page.tsx              # Metadata trang chủ
├── components/
│   ├── ui/                   # Các nguyên tố shadcn/ui (Button, Input, Select, Switch, Label)
│   ├── AnimatedWifiSignal.tsx# Biểu tượng radar sóng WiFi động tại gốc tọa độ
│   ├── DetectedPoints.tsx    # Đánh dấu điểm người trên radar (màu theo id)
│   ├── Footer.tsx            # Footer credits (Tony Trần · Orange Pi VN)
│   ├── InteractiveRoom.tsx   # BẢNG ĐIỀU KHIỂN CHÍNH — Grid Header/Thống kê/Radar/Log
│   ├── MoveableResizableZone.tsx  # Overlay vùng có thể kéo & thay kích thước
│   ├── ThemeProvider.tsx     # Context sáng/tối + lưu localStorage
│   └── ThemeToggle.tsx       # Nút chuyển sáng ↔ tối (Mặt trời / Mặt trăng)
├── config/index.ts           # IP ESP32 mặc định, tọa độ phòng, giới hạn vùng
├── hooks/useWebSocket.ts     # Client WS, parser targets, bộ đệm log (100)
├── lib/utils.ts              # Helper nối classnames cn()
├── types/index.ts            # Zone, Point, Target, WsMessage, WsLogEntry
└── utils/coordinates.ts      # Bộ ánh xạ tọa độ tuyến tính (mm ↔ px)
```

---

## 📡 Thỏa thuận Payload WebSocket

ESP32 phải phát các frame JSON theo cấu trúc sau:

```jsonc
{
  "targets": [
    { "id": 1, "x": 1788, "y": 2091, "valid": 1 },  // Mục tiêu hợp lệ
    { "id": 2, "x": -32768, "y": -32768, "valid": 0 }, // Vị trí trống (bỏ qua)
    { "id": 3, "x": -32768, "y": -32768, "valid": 0 }
  ]
}
```

| Trường | Đơn vị / Khoảng | Mô tả |
|---|---|---|
| `x` | mm, `[-4000, 4000]` | Vị trí ngang so với cảm biến (giữa = 0) |
| `y` | mm, `[1, 6000]` | Khoảng cách phía trước cảm biến (dưới cùng radar = 0) |
| `valid` | `0 \| 1` | `1` = mục tiêu thực, `0` = slot trống (bỏ qua) |

---

## 🖼️ Bố cục Bảng điều khiển (Responsive)

### Desktop (lg: ≥ 1024px)
```
┌──────────────────────────────────────────────────────────────────┐
│  Header:  [Logo LD2450]  ESP32 IP pill  [ON/OFF]  ☀/🌙 toggle   │
├──────────────────────────────────────────────────────────────────┤
│  Bộ chọn ESP32 & các nút điều khiển Edit Mode                    │
├──────────────────────────────────────────────────────────────────┤
│  Đã phát hiện │ Vùng │ Sự kiện   ← 3 thẻ thống kê              │
├───────────────────────────────────────┬──────────────────────────┤
│                                       │                          │
│     RADAR VIEW (rộng 3/5)             │   WS LOG STREAM (2/5)   │
│     ┌──────────────────────────┐     │   ┌──────────────────┐  │
│     │    ·          T1        │     │   │ [ts] {json}       │  │
│     │                          │     │   │ [ts] {json}       │  │
│     │  📡  T2                  │     │   │ [ts] {json}       │  │
│     │                          │     │   │ T1(1788,2091)     │  │
│     └──────────────────────────┘     │   └──────────────────┘  │
│                                       │                          │
├───────────────────────────────────────┴──────────────────────────┤
│  Footer: Được tạo ra với ❤ bởi Tony Trần · © 2026 · Orange Pi VN │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (< 1024px)
Cùng nội dung, xếp chồng theo chiều dọc: **Header → Controls → Stats → Radar → Logs → Footer**

---

## ⚙️ Cấu hình

Mở file `config/index.ts` để tinh chỉnh các tham số mặc định:

```ts
const DEFAULT_ESP32_IP = '192.168.88.95'

zones: {
  maxCount: 3,      // Số vùng tối đa (UI sẽ không cho tạo thêm)
  defaultSize: 2000,// Kích thước vùng mặc định khi tạo mới, tính bằng mm
  minSize: 20,      // Kích thước vùng nhỏ nhất có thể resize, tính bằng mm
},
room: {
  coordinates: {
    minX: -4000, maxX: 4000,  // Tổng chiều ngang 8m
    minY: 1,     maxY: 6000,  // Khoảng cách phía trước 6m
  }
}
```

---

## 👥 Góp công & Bản quyền

- **Được tạo ra với ❤ bởi [Tony Trần](https://tony.id.vn)**
- Hợp tác cùng **[Orange Pi Việt Nam](https://orangepi.vn)**
- Copyright © 2026

---

## 📚 Tìm hiểu thêm

- [Tài liệu Next.js](https://nextjs.org/docs)
- [Chế độ Tối Tailwind CSS](https://tailwindcss.com/docs/dark-mode)
- [Datasheet HLK-LD2450](https://www.hlktech.com/en/Product/118.html)
