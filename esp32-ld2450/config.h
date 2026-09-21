#pragma once

// ---------------------------------------------------------------
// Debug / diagnostic switches
// ---------------------------------------------------------------
// 1 = print every raw UART frame candidate as hex on the Serial
//     Monitor (115200). Use this to capture real traffic from the
//     module so the frame format can be confirmed/reverse-engineered.
#define DEBUG_RADAR_RAW 0

// 1 = diagnostic mode only: Serial-only target printout, no Wi-Fi,
//     no web server, no WebSocket (màn hình LCD vẫn chạy ở cả 2 mode).
//     Đây là giai đoạn khuyến nghị chạy trước để xác nhận parser đúng
//     với phần cứng thật trước khi bật networking.
// 0 = full stage-2 firmware: Wi-Fi + REST API + WebSocket + zones.
#define DIAGNOSTIC_MODE 0

// ---------------------------------------------------------------
// Sửa lỗi giải mã dấu (sign bit) của toạ độ X và Y
// ---------------------------------------------------------------
// Quan sát thực tế trên phần cứng: mỗi khi toạ độ (X hoặc Y) thật sự âm,
// thư viện lại trả về một số âm rất lớn quanh -32000 đến -32768 thay vì
// giá trị âm nhỏ đúng — dấu hiệu kinh điển của lỗi giải mã 16-bit: giá
// trị đúng phải là (raw uint16) - 32768, nhưng thư viện lại trả nguyên
// giá trị đó dưới dạng int16_t có dấu. Ban đầu chỉ thấy rõ ở Y vì lúc đó
// X luôn dương (chưa đi qua bên trái tâm cảm biến); khi target di
// chuyển sang X âm thì lộ ra lỗi giống hệt. Bật cờ này để tự sửa lại cả
// target.x lẫn target.y trước khi dùng (in log, tính zone, gửi WebSocket,
// vẽ màn hình). Tắt về 0 nếu sau này thư viện tự sửa lỗi này.
#define FIX_LD2450_XY_SIGN_BUG 1

// ---------------------------------------------------------------
// Chân UART nối module radar LD2450
// ---------------------------------------------------------------
// Board: ES3N28P (ESP32-S3 2.8" ILI9341 SPI). Theo tài liệu breakout
// của board, các chân "Expand pin" dùng được tự do là IO2, IO3, IO14,
// IO21. Tránh IO3 (chân strapping JTAG-boot trên ESP32-S3, board vẫn
// cho phép dùng nhưng để an toàn mình chọn 2 chân KHÔNG nằm trong danh
// sách strapping {0,3,45,46}).
#define RADAR_RX_PIN 2  // nối vào chân TX của module LD2450
#define RADAR_TX_PIN 14 // không cần nối dây thật, chỉ khai báo cho đủ UART

// ---------------------------------------------------------------
// Màn hình LCD ILI9341 (bus SPI, không phải bus song song 8080)
// ---------------------------------------------------------------
#define LCD_CS 10
#define LCD_DC 46
#define LCD_SCK 12
#define LCD_MOSI 11 // SPI bus write data (SDI)
#define LCD_MISO 13 // SPI bus read data (SDO) — thường không cần dùng tới
// Chân RST của LCD dùng chung với nút reset/EN của cả board (không có
// chân reset riêng cho LCD điều khiển được bằng phần mềm) -> dùng
// GFX_NOT_DEFINED khi khởi tạo Arduino_GFX.
#define LCD_BL 45 // đèn nền, mức CAO = bật
#define LCD_ROTATION 0 // 0-3, đổi nếu hình bị lật/xoay sai hướng khi lắp

// ---------------------------------------------------------------
// RGB LED tích hợp (1 dây kiểu WS2812/NeoPixel, KHÔNG phải GPIO on/off
// thường — cần thư viện Adafruit_NeoPixel để điều khiển)
// ---------------------------------------------------------------
#define RGB_LED_PIN 42
#define RGB_LED_BRIGHTNESS 40 // 0-255, để thấp cho đỡ chói

// ---------------------------------------------------------------
// Layout vẽ radar lên màn hình (giả định LCD_ROTATION 0: 240 rộng x
// 320 cao). Nếu đổi rotation, có thể cần chỉnh lại các số dưới đây.
// ---------------------------------------------------------------
#define PLOT_TOP 14           // vùng vẽ bắt đầu từ y này (chừa chỗ tiêu đề)
#define PLOT_W 240             // bề rộng vùng vẽ (px), = bề rộng màn hình
#define PLOT_H 200             // chiều cao vùng vẽ (px)
#define PLOT_X_RANGE_MM 3000  // ánh xạ X từ -3000..+3000mm ra bề rộng vùng vẽ
#define PLOT_Y_RANGE_MM 6000  // ánh xạ Y từ 0..6000mm ra chiều cao vùng vẽ (LD2450 tầm xa ~6m)
#define TEXT_TOP (PLOT_TOP + PLOT_H + 8) // vùng chữ liệt kê target bắt đầu từ đây