# Hệ thống Phát hiện Vùng có người dùng Radar HLK-LD2450

> 🌐 **Read this document in English:** [README-en.md](README-en.md)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)
![ESP32](https://img.shields.io/badge/ESP32-Ready-blue)
![React](https://img.shields.io/badge/React-18-61dafb)

## 📋 Mục lục
- [Tính năng](#-tính-năng)
- [Kiến trúc Hệ thống](#-kiến-trúc-hệ-thống)
- [Thiết lập Phần cứng](#-thiết-lập-phần-cứng)
- [Cài đặt](#️-cài-đặt)
- [Hướng dẫn Sử dụng](#-hướng-dẫn-sử-dụng)
- [Thông số Kỹ thuật](#-thông-số-kỹ-thuật)
- [Tài liệu API](#-tài-liệu-api)
- [Bản quyền](#-bản-quyền)

## 🌟 Tính năng

### Khả năng Radar
- Công nghệ radar mmWave 24GHz độ chính xác cao
- Theo dõi thời gian thực lên đến 3 mục tiêu cùng lúc
- Phạm vi phát hiện: 6 mét
- Độ chính xác vị trí cấp milimét
- Phát hiện sự hiện diện không xâm phạm quyền riêng tư (không dùng camera)

### Giao diện Web Tương tác
- Hiển thị vị trí thời gian thực
- Cấu hình vùng kéo-thả (drag-and-drop)
- Thiết kế responsive trên di động
- Hiển thị theo dõi mục tiêu trực tiếp
- Chỉ báo trạng thái kết nối trực quan
- Phản hồi tình trạng chiếm dụng vùng

### Quản lý Vùng Thông minh
- Tạo tối đa 3 vùng phát hiện tùy chỉnh
- Công cụ chỉnh sửa vùng trực quan
- Vùng được lưu lại giữa các phiên
- Kiểm tra hợp lệ vùng thời gian thực
- Tự động ánh xạ tọa độ

### Giao tiếp
- Cập nhật thời gian thực dựa trên WebSocket
- RESTful API cho cấu hình vùng
- Xử lý lỗi vững chắc
- Tự động kết nối lại
- Truyền dữ liệu an toàn

## 🏗 Kiến trúc Hệ thống

### Lớp Phần cứng
- **Cảm biến Radar HLK-LD2450**
  - Công nghệ mmWave 24GHz
  - Giao diện giao tiếp nối tiếp (Serial)
  - Thuật toán theo dõi mục tiêu tích hợp
  - Tiêu thụ điện năng thấp

- **Bộ điều khiển ESP32**
  - Bộ xử lý nhân đôi (Dual-core)
  - Máy chủ WebSocket
  - Endpoint REST API
  - Kết nối WiFi
  - Bộ xử lý giao tiếp Serial

### Lớp Phần mềm
- **Phần mềm (Firmware) ESP32**
  - Quản lý tác vụ FreeRTOS
  - Triển khai WebSocket server
  - Xử lý dữ liệu JSON
  - Thuật toán tính toán vùng

- **Ứng dụng Web React**
  - React 18 hiện đại với hooks
  - Client WebSocket thời gian thực
  - Trình soạn thảo vùng tương tác
  - Hệ thống thiết kế responsive
  - Triển khai Error boundary

### Luồng Dữ liệu
1. Cảm biến radar thu thập dữ liệu vị trí
2. ESP32 xử lý và xác nhận hợp lệ dữ liệu
3. Tính toán hiện diện vùng
4. Dữ liệu được truyền trực tiếp qua WebSocket
5. Giao diện Web cập nhật thời gian thực

## 🔧 Thiết lập Phần cứng

### Danh sách Linh kiện
- Cảm biến radar 24GHz HLK-LD2450
- Board phát triển ESP32
- Nguồn cấp USB-C (5V)
- Dây nối jumper
- Tùy chọn: Vỏ in 3D

### Sơ đồ Nối dây
```
HLK-LD2450  |  ESP32-WROOM
---------------------------
     5V     |     5V/VIN
    GND     |      GND
     TX     |  GPIO16 (RX2)
     RX     |  GPIO17 (TX2)
```

### Khuyến nghị Lắp đặt
- Gắn cảm biến radar ở độ cao 1,2-1,5m
- Đảm bảo tầm nhìn không bị cản trở
- Tránh các chướng ngại vật bằng kim loại
- Đặt xa khỏi ăng-ten WiFi

## ⚙️ Cài đặt

### Chuẩn bị Môi trường Phát triển ESP32
1. Cài đặt Arduino IDE
2. Cài đặt thư viện HLK-LD2450
3. Clone kho mã nguồn:
   ```bash
   git clone https://github.com/thanhtantran/ESP32-LD2450.git
   ```
4. Cấu hình thông tin đăng nhập WiFi:
   ```cpp
   // WiFiCredentials.h
   #define WIFI_SSID "tên_mạng_wifi_của_bạn"
   #define WIFI_PASSWORD "mật_khẩu_wifi_của_bạn"
   ```
5. Biên dịch và nạp chương trình vào ESP32 bằng Arduino IDE

### Cài đặt Ứng dụng Web

Cài đặt thủ công:

1. Cài đặt Node.js (phiên bản v16 trở lên)
2. Di chuyển vào thư mục web app:
   ```bash
   cd OrangePi-Server/
   ```
3. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
4. Khởi động development server:
   ```bash
   npm run dev
   ```

## 🎯 Hướng dẫn Sử dụng

### Chuẩn bị Ban đầu
1. Cấp nguồn cho ESP32
2. Ghi lại địa chỉ IP của ESP32 từ đầu ra Serial Monitor
3. Mở giao diện Web tại địa chỉ http://localhost:3000
4. Cấu hình địa chỉ IP trong ứng dụng Web

### Cấu hình Vùng
1. Bật "Edit Mode" (Chế độ Chỉnh sửa)
2. Nhấn "New Zone" để tạo vùng mới
3. Kéo để đặt vị trí vùng
4. Sử dụng các núm điều chỉnh (handles) để thay đổi kích thước
5. Lưu cấu hình bằng cách tắt "Edit Mode"

### Giám sát Thời gian Thực
- Xem vị trí mục tiêu trực tiếp
- Giám sát tình trạng chiếm dụng vùng
- Kiểm tra trạng thái kết nối
- Xem quỹ đạo di chuyển của mục tiêu

## 🔍 Thông số Kỹ thuật

### Thông số Radar
- Tần số: 24GHz
- Phạm vi: 6m
- Tốc độ cập nhật: 20Hz
- Độ phân giải: 1mm
- Góc nhìn trường nhìn: 120°

### Cấu hình Vùng
- Số vùng tối đa: 3
- Khoảng X: -4000 đến 4000mm
- Khoảng Y: 1 đến 6000mm
- Kích thước tối thiểu: 20x20mm
- Kích thước tối đa: 8000x6000mm

## 📡 Tài liệu API

### Endpoint WebSocket
- URL: `ws://<IP_ESP32>/ws`
- Giao thức: WebSocket
- Định dạng: JSON

### Endpoint REST
- Cấu hình Vùng:
  ```
  GET  /zones          // Lấy danh sách vùng
  POST /updateZones    // Cập nhật danh sách vùng
  ```

### Định dạng Dữ liệu
```json
{
  "zones": [
    {
      "id": 1,
      "x1": -4000,
      "y1": 1,
      "x2": 4000,
      "y2": 6000
    }
  ]
}
```

## 📄 Bản quyền
Mã nguồn này dựa trên kho mã gốc: https://github.com/nick28s/IoTProject-ZonePresenceDetection-LD2450/

Cùng loại giấy phép với kho mã gốc.

Dự án này được cấp phép theo © Giấy phép GPL3+ - xem chi tiết trong file [LICENSE](LICENSE).
