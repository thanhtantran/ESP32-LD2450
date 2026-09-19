#pragma once

// ---------------------------------------------------------------
// Debug / diagnostic switches
// ---------------------------------------------------------------
// 1 = print every raw UART frame candidate as hex on the Serial
//     Monitor (115200). Use this to capture real traffic from the
//     module so the frame format can be confirmed/reverse-engineered.
#define DEBUG_RADAR_RAW 1

// 1 = diagnostic mode only: Serial-only target printout, no Wi-Fi,
//     no web server, no WebSocket. This is the recommended first
//     stage — get the parser confirmed against real hardware before
//     bringing up networking.
// 0 = full stage-2 firmware: Wi-Fi + REST API + WebSocket + zones.
#define DIAGNOSTIC_MODE 1
