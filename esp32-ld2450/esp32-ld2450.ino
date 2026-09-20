#include <Arduino.h>
#include <math.h>
#include <LD2450.h>
#include "config.h"

#if !DIAGNOSTIC_MODE
#include <WiFi.h>
#include <ESPAsyncWebServer.h>   // AsyncWebSocket đã được include sẵn bên trong file này
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

#if !DIAGNOSTIC_MODE
boolean zone1, zone2, zone3;

// Create an AsyncWebServer on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws"); // Set up WebSocket on "/ws"

// Define zones as rectangles with (x1, y1)LeftDownCorner and (x2, y2)RightUpCorner
struct Zone
{
  int x1, y1, x2, y2;
};

Zone zones[3] = {
    {-4000, 1, -1, 4000},     // Zone 2
    {1, 1, 4000, 4000},       // Zone 1
    {-4001, 4001, 4001, 6000} // Zone 3
};

bool tempZone1 = false;
bool tempZone2 = false;
bool tempZone3 = false;

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;

WiFiClient espClient;

void setup_wifi()
{
  delay(10);
  // connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
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
// In dữ liệu frame thô cuối cùng nhận từ radar (nếu bật DEBUG_RADAR_RAW).
// Dùng getLastTargetMessage() của thư viện LD2450 để xem đúng những gì
// module gửi lên trước khi bị parse thành target, hữu ích khi cần xác
// nhận/định lại format frame trên phần cứng thật.
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// Sửa lỗi giải mã dấu của toạ độ Y (xem giải thích trong config.h).
// Luôn gọi hàm này để lấy Y thay vì đọc thẳng target.y.
// ---------------------------------------------------------------
int32_t fixRadarY(int32_t rawY)
{
#if FIX_LD2450_Y_SIGN_BUG
  return (int32_t)(uint16_t)rawY - 32768;
#else
  return rawY;
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

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);

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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    setup_wifi();
  }
#endif

  last_target_data = "";
  if (ld2450.read() > 0)
  {
    printRawIfEnabled();

    if (ld2450.getTarget(0).valid == 0 && ld2450.getTarget(1).valid == 0 && ld2450.getTarget(2).valid == 0)
    {
      digitalWrite(LED_PIN, LED_OFF);
#if !DIAGNOSTIC_MODE
      zone1 = false;
      zone2 = false;
      zone3 = false;
      for (int i = 0; i < ld2450.getSensorSupportedTargetCount(); i++)
      {
        JSON_DOC(128) doc;
        doc["id"] = i + 1;
        doc["x"] = 0;
        doc["y"] = 0;

        String jsonString;
        serializeJson(doc, jsonString);
        ws.textAll(jsonString); // Send to all connected WebSocket clients
      }
#endif
    }
    else
    {
      digitalWrite(LED_PIN, LED_ON);
#if !DIAGNOSTIC_MODE
      tempZone1 = false;
      tempZone2 = false;
      tempZone3 = false;
#endif

      for (int i = 0; i < ld2450.getSensorSupportedTargetCount(); i++)
      {
        const LD2450::RadarTarget target = ld2450.getTarget(i);
        int32_t targetY = fixRadarY(target.y);
        uint32_t targetDistance = (uint32_t)round(sqrt((double)target.x * target.x + (double)targetY * targetY));
        // Add target information to the string
        last_target_data += "TARGET ID=" + String(i + 1) + " X=" + String((target.x)) + "mm, Y=" + String(targetY) + "mm, SPEED=" + String(target.speed) + "cm/s, RESOLUTION=" + String(target.resolution) + "mm, DISTANCE=" + String(targetDistance) + "mm, VALID=" + String(target.valid) + "\n";

#if !DIAGNOSTIC_MODE
        // Send positions via WebSocket
        JSON_DOC(128) doc;
        doc["id"] = i + 1;
        doc["x"] = target.x;
        doc["y"] = targetY;

        String jsonString;
        serializeJson(doc, jsonString);
        if (ws.availableForWriteAll()) {
          ws.textAll(jsonString); // Send to all connected WebSocket clients
        }

        // Check if target is within any zone
        for (int j = 0; j < 3; j++)
        {
          if ((target.x) >= zones[j].x1 && (target.x) <= zones[j].x2 && targetY >= zones[j].y1 && targetY <= zones[j].y2)
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
