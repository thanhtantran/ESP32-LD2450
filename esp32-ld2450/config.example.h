#pragma once

// ---------------------------------------------------------------
// Debug / diagnostic switches
// ---------------------------------------------------------------
// 1 = print every raw UART frame candidate as hex on the Serial
//     Monitor (115200). Use this to capture real traffic from the
//     module so the frame format can be confirmed/reverse-engineered.
#define DEBUG_RADAR_RAW 0

// 1 = diagnostic mode only: Serial-only target printout, no Wi-Fi,
//     no web server, no WebSocket. This is the recommended first
//     stage — get the parser confirmed against real hardware before
//     bringing up networking.
// 0 = full stage-2 firmware: Wi-Fi + REST API + WebSocket + zones.
#define DIAGNOSTIC_MODE 1

// ---------------------------------------------------------------
// Chân UART nối module radar LD2450
// ---------------------------------------------------------------
// QUAN TRỌNG: board của bạn là ESP32-S2 (native USB), chip này chỉ có
// 2 UART cứng (UART0 dùng cho USB-CDC/nạp code, UART1) chứ KHÔNG có
// Serial2 như ESP32 cổ điển. Trên S2/S3/C3, UART không có "chân mặc
// định" cố định (route qua ma trận GPIO) nên phải khai báo tường minh.
// Đổi 2 số dưới đây theo đúng dây bạn nối LD2450 <-> ESP32-S2.
// Tránh các chân: 19, 20 (USB D-/D+ native), 0/45/46 (strapping),
// và bất kỳ chân nào màn hình LCD/touch đang dùng (SPI, CS, DC, RST, IRQ).
#define RADAR_RX_PIN 16 // nối vào chân TX của module LD2450
#define RADAR_TX_PIN 17 // nối vào chân RX của module LD2450 (LD2450 ít khi cần nhận lệnh, nhưng vẫn khai báo cho đủ UART)