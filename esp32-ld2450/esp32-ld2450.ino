#include <Arduino.h>
#include <math.h>
#include <LD2450.h>
#include "config.h"

#if !DIAGNOSTIC_MODE
#include <WiFi.h>
#include <ESPAsyncWebServer.h> // AsyncWebSocket đã được include sẵn bên trong file này
#include <ArduinoJson.h>
#include "WiFiCredentials.h"

// --- Tương thích ArduinoJson v6 và v7 ---
// ArduinoJson v7 đã bỏ StaticJsonDocument<N> và createNestedObject(), nếu bạn
// cài ArduinoJson v7 qua Library Manager mà giữ nguyên code kiểu v6 sẽ bị lỗi
// biên dịch dạng "no member named 'createNestedObject'".
#if ARDUINOJSON_VERSION_MAJOR >= 7
#define JSON_DOC(size) JsonDocument
#else
#define JSON_DOC(size) StaticJsonDocument<size>
#endif
#endif // !DIAGNOSTIC_MODE

// Thư viện màn hình (cài qua Library Manager: "GFX Library for Arduino" của
// moononournation) và LED WS2812 tích hợp.
#include <Arduino_GFX_Library.h>
#include <Adafruit_NeoPixel.h>

// ESP32-S2/S3/C3 không có Serial2 (chỉ 2-3 UART tuỳ chip, và không cố định
// chân). ESP32 cổ điển (dual-core, không native USB) mới có Serial2 với
// chân mặc định 16/17. Macro dưới đây tự chọn đúng UART theo chip đang build.
#if CONFIG_IDF_TARGET_ESP32S2 || CONFIG_IDF_TARGET_ESP32S3 || CONFIG_IDF_TARGET_ESP32C3
#define RADAR_SERIAL Serial1
#else
#define RADAR_SERIAL Serial2
#endif

String last_target_data = "";

// SENSOR INSTANCE
LD2450 ld2450;

// Define zones as rectangles with (x1, y1)LeftDownCorner and (x2, y2)RightUpCorner
// Khai báo ở ngoài DIAGNOSTIC_MODE vì màn hình cần vẽ zone ở cả 2 chế độ.
struct Zone
{
  int x1, y1, x2, y2;
};

Zone zones[3] = {
    {-4000, 1, -1, 4000},     // Zone 2
    {1, 1, 4000, 4000},       // Zone 1
    {-4001, 4001, 4001, 6000} // Zone 3
};

#if !DIAGNOSTIC_MODE
boolean zone1, zone2, zone3;

// Create an AsyncWebServer on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws"); // Set up WebSocket on "/ws"

bool tempZone1 = false;
bool tempZone2 = false;
bool tempZone3 = false;

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;

WiFiClient espClient;

void setup_wifi()
{
  delay(10);

  // Quét trước để xem module có THẤY được mạng đích không (giúp phân biệt
  // "SSID/mật khẩu sai" với "không thấy sóng gì cả" — trường hợp sau là
  // vấn đề anten/khoảng cách/băng tần 5GHz, không phải lỗi thông tin WiFi).
  Serial.println();
  Serial.println("Scanning WiFi networks...");
  int n = WiFi.scanNetworks();
  if (n == 0)
  {
    Serial.println("=> Khong thay bat ky mang WiFi nao! Kha nang cao la loi anten/RF cua board, khong phai sai SSID/mat khau.");
  }
  else
  {
    bool foundTarget = false;
    for (int i = 0; i < n; i++)
    {
      Serial.printf("  %d: %s (RSSI %d dBm)%s\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                    WiFi.SSID(i) == String(ssid) ? "  <-- muc tieu" : "");
      if (WiFi.SSID(i) == String(ssid))
        foundTarget = true;
    }
    if (!foundTarget)
    {
      Serial.println("=> Khong thay dung SSID trong danh sach quet duoc! Kiem tra lai ten mang, hoac mang do la 5GHz (ESP32 khong ho tro 5GHz).");
    }
  }

  // connecting to a WiFi network
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.printf(".[status=%d] ", WiFi.status());
    attempts++;
    if (attempts >= 40) // ~20 giây không lên được thì in gợi ý và thử lại từ đầu
    {
      Serial.println();
      Serial.println("Van chua ket noi duoc sau 20s. Ma status() gan nhat da in o tren:");
      Serial.println("  1=WL_NO_SSID_AVAIL (khong thay SSID - anten/khoang cach/5GHz)");
      Serial.println("  4=WL_CONNECT_FAILED (thuong la sai mat khau)");
      Serial.println("  6=WL_DISCONNECTED (dang thu lai)");
      attempts = 0;
    }
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

// WebSocket event handling
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  if (type == WS_EVT_CONNECT)
  {
    Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
  }
  else if (type == WS_EVT_DISCONNECT)
  {
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
  }
}
#endif // !DIAGNOSTIC_MODE

// ---------------------------------------------------------------
// Màn hình ILI9341 qua SPI (bus 4 dây: CS/DC/SCK/MOSI/MISO), RST dùng
// chung với nút reset của board nên truyền GFX_NOT_DEFINED.
// ---------------------------------------------------------------
Arduino_DataBus *lcdBus = new Arduino_ESP32SPI(LCD_DC, LCD_CS, LCD_SCK, LCD_MOSI, LCD_MISO);
Arduino_GFX *gfx = new Arduino_ILI9341(lcdBus, GFX_NOT_DEFINED, LCD_ROTATION);

// RGB LED tích hợp (1 LED WS2812 ở GPIO 42)
Adafruit_NeoPixel rgbLed(1, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);

// ---------------------------------------------------------------
// Sửa lỗi giải mã dấu của toạ độ X/Y (xem giải thích trong config.h).
// Luôn gọi hàm này để lấy X, Y thay vì đọc thẳng target.x/target.y.
// ---------------------------------------------------------------
int32_t fixLD2450Coord(int32_t rawValue)
{
#if FIX_LD2450_Y_SIGN_BUG
  return (int32_t)(uint16_t)rawValue - 32768;
#else
  return rawValue;
#endif
}

void printRawIfEnabled()
{
#if DEBUG_RADAR_RAW
  String raw = ld2450.getLastTargetMessage();
  if (raw.length() > 0)
  {
    Serial.print("RAW: ");
    Serial.println(raw);
  }
#endif
}

// Bật/tắt LED trạng thái (xanh lá = đang có người, tắt = không có ai)
void setStatusLed(bool detected)
{
  rgbLed.setPixelColor(0, detected ? rgbLed.Color(0, 255, 0) : 0);
  rgbLed.show();
}

// Đổi toạ độ mm sang toạ độ pixel trong vùng vẽ radar
int plotX(int32_t xmm)
{
  long v = map(xmm, -PLOT_X_RANGE_MM, PLOT_X_RANGE_MM, 0, PLOT_W - 1);
  return constrain(v, 0, PLOT_W - 1);
}
int plotY(int32_t ymm)
{
  // Gần cảm biến (Y nhỏ) vẽ ở dưới vùng plot, xa (Y lớn) vẽ ở trên -
  // giống góc nhìn radar thường thấy.
  long v = map(ymm, 0, PLOT_Y_RANGE_MM, PLOT_H - 1, 0);
  return PLOT_TOP + constrain(v, 0, PLOT_H - 1);
}

// Vẽ lại toàn bộ màn hình: khung zone + chấm target + danh sách text.
// dispX/dispY/dispValid: dữ liệu 3 target đã sửa Y, size cố định 3.
void updateDisplay(int32_t dispX[3], int32_t dispY[3], uint8_t dispValid[3])
{
  gfx->fillScreen(RGB565_BLACK);

  // Tiêu đề
  gfx->setTextColor(RGB565_WHITE);
  gfx->setTextSize(1);
  gfx->setCursor(4, 2);
  gfx->print("LD2450 Radar");

  // Khung vùng vẽ
  gfx->drawRect(0, PLOT_TOP, PLOT_W, PLOT_H, 0x4208 /* xám đậm, RGB565 */);

#if !DIAGNOSTIC_MODE
  // Khung 3 zone, mỗi zone 1 màu để phân biệt
  const uint16_t zoneColors[3] = {RGB565_RED, RGB565_GREEN, RGB565_BLUE};
  for (int j = 0; j < 3; j++)
  {
    int sx1 = plotX(zones[j].x1);
    int sx2 = plotX(zones[j].x2);
    int sy1 = plotY(zones[j].y1);
    int sy2 = plotY(zones[j].y2);
    int left = min(sx1, sx2);
    int top = min(sy1, sy2);
    int w = abs(sx2 - sx1);
    int h = abs(sy2 - sy1);
    if (w < 1)
      w = 1;
    if (h < 1)
      h = 1;
    gfx->drawRect(left, top, w, h, zoneColors[j]);
  }
#endif

  // Chấm target trên vùng vẽ
  for (int i = 0; i < 3; i++)
  {
    if (!dispValid[i])
      continue;
    int sx = plotX(dispX[i]);
    int sy = plotY(dispY[i]);
    gfx->fillCircle(sx, sy, 4, RGB565_YELLOW);
    gfx->setTextColor(RGB565_YELLOW);
    gfx->setCursor(sx + 6, sy - 4);
    gfx->print(i + 1);
  }

  // Danh sách text 3 target bên dưới vùng vẽ
  int ty = TEXT_TOP;
  for (int i = 0; i < 3; i++)
  {
    gfx->setCursor(4, ty);
    gfx->setTextColor(dispValid[i] ? RGB565_WHITE : 0x7BEF /* xám nhạt */);
    gfx->print("ID");
    gfx->print(i + 1);
    gfx->print(" X=");
    gfx->print(dispX[i]);
    gfx->print(" Y=");
    gfx->print(dispY[i]);
    gfx->print(dispValid[i] ? " OK" : " --");
    ty += 12;
  }
}

void setup()
{
  // Initialize serial and wait for port to open:
  Serial.begin(115200);
  // This delay gives the chance to wait for a Serial Monitor without blocking if none is found
  delay(1500);

#if DIAGNOSTIC_MODE
  Serial.println("=== DIAGNOSTIC_MODE: Serial-only, khong WiFi/WebSocket ===");
#else
  Serial.println("=== FULL MODE: WiFi + REST API + WebSocket + zones ===");
#endif

  ld2450.setNumberOfTargets(3);
  // Tự mở UART với chân tường minh (bắt buộc trên ESP32-S2/S3/C3), rồi báo
  // cho thư viện là đã sẵn sàng (already_initialized = true) để nó không
  // tự gọi begin() thiếu chân nữa.
  RADAR_SERIAL.begin(256000, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);
  ld2450.begin(RADAR_SERIAL, true);

  // RGB LED
  rgbLed.begin();
  rgbLed.setBrightness(RGB_LED_BRIGHTNESS);
  setStatusLed(false);

  // Màn hình LCD
  pinMode(LCD_BL, OUTPUT);
  digitalWrite(LCD_BL, HIGH); // bật đèn nền
  gfx->begin();
  gfx->fillScreen(RGB565_BLACK);
  gfx->setTextColor(RGB565_WHITE);
  gfx->setCursor(4, 4);
  gfx->print("Dang khoi dong...");

#if !DIAGNOSTIC_MODE
  zone1 = false;
  zone2 = false;
  zone3 = false;

  setup_wifi();

  // Initialize WebSocket
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);

  // Debugging log
  Serial.println("WebSocket server initialized.");

  // Set up POST endpoint
  server.on("/updateZones", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
            {
      // Process JSON data
      JSON_DOC(512) doc;
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.print("JSON parsing failed: ");
        Serial.println(error.c_str());
        request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
        return;
      }

      // Write JSON data into the Zone struct
      for (int i = 0; i < 3; i++) {
        zones[i].x1 = doc[i]["x1"] | zones[i].x1; // Default value if JSON value is missing
        zones[i].y1 = doc[i]["y1"] | zones[i].y1;
        zones[i].x2 = doc[i]["x2"] | zones[i].x2;
        zones[i].y2 = doc[i]["y2"] | zones[i].y2;

        // Debug output
        Serial.print("Zone ");
        Serial.print(i + 1);
        Serial.print(": x1=");
        Serial.print(zones[i].x1);
        Serial.print(", y1=");
        Serial.print(zones[i].y1);
        Serial.print(", x2=");
        Serial.print(zones[i].x2);
        Serial.print(", y2=");
        Serial.println(zones[i].y2);
      }

      // Send success message
      request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Zones updated\"}"); });

  // Handle GET request for zones
  server.on("/zones", HTTP_GET, [](AsyncWebServerRequest *request)
            {
    JSON_DOC(512) doc;

    // Serialize zones into JSON array
    JsonArray zonesArray = doc.to<JsonArray>();
    for (int i = 0; i < 3; i++) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonObject zone = zonesArray.add<JsonObject>();
#else
      JsonObject zone = zonesArray.createNestedObject();
#endif
      zone["x1"] = zones[i].x1;
      zone["y1"] = zones[i].y1;
      zone["x2"] = zones[i].x2;
      zone["y2"] = zones[i].y2;
    }

    String jsonResponse;
    serializeJson(doc, jsonResponse);

    // Send JSON response
    request->send(200, "application/json", jsonResponse); });

  // Start server
  server.begin();
  Serial.println("HTTP server started.");
#endif // !DIAGNOSTIC_MODE
}

void loop()
{
#if !DIAGNOSTIC_MODE
  // Reconnect to WiFi if connection is lost
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi connection lost. Reconnecting...");
    setup_wifi();
  }
#endif

  last_target_data = "";

  // Dữ liệu dùng để vẽ lên màn hình (snapshot của cả 3 target trong vòng lặp này)
  static int32_t dispX[3];
  static int32_t dispY[3];
  static uint8_t dispValid[3];

  if (ld2450.read() > 0)
  {
    printRawIfEnabled();

    if (ld2450.getTarget(0).valid == 0 && ld2450.getTarget(1).valid == 0 && ld2450.getTarget(2).valid == 0)
    {
      setStatusLed(false);
      for (int i = 0; i < 3; i++)
      {
        dispX[i] = 0;
        dispY[i] = 0;
        dispValid[i] = 0;
      }
#if !DIAGNOSTIC_MODE
      zone1 = false;
      zone2 = false;
      zone3 = false;
#endif
    }
    else
    {
      setStatusLed(true);
#if !DIAGNOSTIC_MODE
      tempZone1 = false;
      tempZone2 = false;
      tempZone3 = false;
#endif

      for (int i = 0; i < ld2450.getSensorSupportedTargetCount(); i++)
      {
        const LD2450::RadarTarget target = ld2450.getTarget(i);
        int32_t targetX = fixLD2450Coord(target.x);
        int32_t targetY = fixLD2450Coord(target.y);
        uint32_t targetDistance = (uint32_t)round(sqrt((double)targetX * targetX + (double)targetY * targetY));
        // Add target information to the string
        last_target_data += "TARGET ID=" + String(i + 1) + " X=" + String(targetX) + "mm, Y=" + String(targetY) + "mm, SPEED=" + String(target.speed) + "cm/s, RESOLUTION=" + String(target.resolution) + "mm, DISTANCE=" + String(targetDistance) + "mm, VALID=" + String(target.valid) + "\n";

        dispX[i] = targetX;
        dispY[i] = targetY;
        dispValid[i] = target.valid;

#if !DIAGNOSTIC_MODE
        // Check if target is within any zone
        for (int j = 0; j < 3; j++)
        {
          if (targetX >= zones[j].x1 && targetX <= zones[j].x2 && targetY >= zones[j].y1 && targetY <= zones[j].y2)
          {
            Serial.println("TARGET ID=" + String(i + 1) + " is within ZONE " + String(j + 1));
            switch (j + 1)
            {
            case 1:
              tempZone1 = true;
              break;
            case 2:
              tempZone2 = true;
              break;
            case 3:
              tempZone3 = true;
              break;
            }
          }
        }
#endif // !DIAGNOSTIC_MODE
      }

#if !DIAGNOSTIC_MODE
      zone1 = tempZone1;
      zone2 = tempZone2;
      zone3 = tempZone3;
#endif

      Serial.println(last_target_data);
    }

#if !DIAGNOSTIC_MODE
    // Gửi CẢ 3 target trong đúng 1 gói JSON duy nhất (thay vì 3 gói riêng lẻ
    // trước đây) — client nhận được 1 snapshot đồng nhất của cả khung dữ
    // liệu radar, thay vì 3 "lát cắt" thời điểm khác nhau gây cảm giác rời
    // rạc. LƯU Ý: đây là thay đổi định dạng JSON, frontend cần cập nhật lại
    // cách đọc để khớp field "targets" (mảng) thay vì đọc từng message
    // {"id":...} riêng lẻ như trước.
    if (ws.availableForWriteAll())
    {
      JSON_DOC(384) doc;
      JsonArray targetsArray = doc["targets"].to<JsonArray>();
      for (int i = 0; i < 3; i++)
      {
#if ARDUINOJSON_VERSION_MAJOR >= 7
        JsonObject t = targetsArray.add<JsonObject>();
#else
        JsonObject t = targetsArray.createNestedObject();
#endif
        t["id"] = i + 1;
        t["x"] = dispX[i];
        t["y"] = dispY[i];
        t["valid"] = dispValid[i];
      }
      String jsonString;
      serializeJson(doc, jsonString);
      ws.textAll(jsonString);
    }
#endif

    // Chỉ vẽ lại màn hình tối đa mỗi DISPLAY_REFRESH_MS (xem config.h), thay
    // vì vẽ lại toàn bộ ở MỌI lần đọc radar (~10 lần/giây) — việc vẽ lại
    // dồn dập qua SPI chiếm rất nhiều CPU, làm nghẽn cả WiFi/WebSocket và
    // chính là nguyên nhân khiến dữ liệu tới client bị trễ/rời rạc.
    static unsigned long lastDisplayUpdate = 0;
    if (millis() - lastDisplayUpdate >= DISPLAY_REFRESH_MS)
    {
      updateDisplay(dispX, dispY, dispValid);
      lastDisplayUpdate = millis();
    }
  }
  else
  {
    Serial.println("No data received from sensor");
    RADAR_SERIAL.end();
    Serial.println("Radar UART closed");
    delay(1500);
    ld2450.setNumberOfTargets(3);
    RADAR_SERIAL.begin(256000, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);
    ld2450.begin(RADAR_SERIAL, true);
    Serial.println("Radar UART reopened");
    delay(1500);
  }

#if !DIAGNOSTIC_MODE
  ws.cleanupClients(); // Ensure WebSocket clients are handled
#endif
}
