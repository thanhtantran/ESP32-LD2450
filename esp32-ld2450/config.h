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
#define DIAGNOSTIC_MODE 0

// ---------------------------------------------------------------
// Sửa lỗi giải mã dấu (sign bit) của toạ độ Y
// ---------------------------------------------------------------
// Quan sát thực tế trên phần cứng của bạn: X luôn hợp lý (vài trăm mm),
// nhưng Y luôn ra một số âm rất lớn quanh -32000 đến -32768 — dấu hiệu
// kinh điển của lỗi giải mã 16-bit: giá trị đúng phải là (raw uint16) -
// 32768, nhưng thư viện lại trả nguyên giá trị đó dưới dạng int16_t có
// dấu. Bật cờ này để tự sửa lại target.y trước khi dùng (in log, tính
// zone, gửi WebSocket). Nếu sau này thư viện tự sửa lỗi này ở bản mới,
// hoặc bạn thấy Y bắt đầu sai theo chiều khác, tắt cờ này về 0.
#define FIX_LD2450_Y_SIGN_BUG 1

// ---------------------------------------------------------------
// Chân UART nối module radar LD2450
// ---------------------------------------------------------------
// Board của bạn là ESP32-2432S028 (Cheap Yellow Display) — chip thật là
// ESP32-WROOM-32 cổ điển (có Serial2 bình thường), KHÔNG phải ESP32-S2.
//
// TUYỆT ĐỐI không dùng GPIO1 (TX0) / GPIO3 (RX0) ở header P1 cho LD2450:
// đó chính là UART0 nối thẳng vào CH340 dùng để nạp code + Serial Monitor.
// Nối radar vào đó sẽ làm hỏng cả việc upload lẫn debug qua Serial (dữ
// liệu 256000 baud của radar lẫn vào quá trình bắt tay nạp firmware).
//
// Toàn bộ GPIO khác trên board CYD này đã bị màn hình/touch/SD/loa/LED
// dùng hết, chỉ còn đúng 3 chân trống ở header P3/CN1: GPIO 35 (chỉ
// input), GPIO 22, GPIO 27. Dùng GPIO 22 và 27 (đều là GPIO bình thường,
// có đủ pull-up/pull-down nội) thay vì GPIO 35 — GPIO 35 là chân
// input-only, phần cứng không có điện trở pull-up nên ESP32 core sẽ log
// cảnh báo "gpio_pullup_en... GPIO number error" mỗi lần mở UART (vô hại
// nhưng gây nhiễu log). GPIO 35 để trống, có thể dùng sau cho việc khác.
#define RADAR_RX_PIN 22 // nối vào chân TX của module LD2450 (header P3/CN1)
#define RADAR_TX_PIN 27 // không cần nối dây thật, chỉ khai báo cho đủ UART (header CN1)

// ---------------------------------------------------------------
// LED báo hiệu có mục tiêu
// ---------------------------------------------------------------
// GPIO 2 (dùng trong code gốc) chính là chân DC của màn hình LCD trên
// board CYD này — KHÔNG được dùng lại cho LED. Board có sẵn RGB LED ở
// GPIO 4 (đỏ) / 16 (lục) / 17 (lam), hoạt động active-LOW (mức thấp = sáng).
#define LED_PIN 4
#define LED_ON LOW
#define LED_OFF HIGH