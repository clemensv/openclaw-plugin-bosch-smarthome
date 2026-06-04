# openclaw-plugin-bosch-smarthome

An [OpenClaw](https://openclaw.ai) plugin that connects your AI assistant to the **Bosch Smart Home Controller** via its local REST API.

Control lights, thermostats, shutters, door/window contacts, alarm systems, and more — all from natural language.

## Features

- 🔑 **Pairing** — one-time pairing with your controller (press the physical button once)
- 💡 **Devices** — list, inspect, and control all paired devices
- 🌡️ **State control** — set thermostat temperatures, switch lights, open/close shutters
- 🎬 **Scenarios** — list and trigger automation scenarios
- 🚨 **Alarm** — arm/disarm the intrusion detection system
- 📋 **Messages** — read system notifications and warnings
- 🏠 **Rooms** — list rooms and their assignments

## Privacy

**No secrets, IPs, or credentials are ever stored in this repository.**

Credentials (controller IP, client certificate, private key) are stored locally at:
```
~/.openclaw/bosch-smarthome/credentials.json
```
with restricted file permissions (mode 600). They never leave your machine.

## Installation

```bash
openclaw plugins install github:clemensv/openclaw-plugin-bosch-smarthome
```

Then restart the OpenClaw gateway.

## Setup

1. Open the Bosch Smart Home app and note your **system password**
2. Find your controller's **local IP address** (check your router)
3. Ask your OpenClaw assistant:

> "Pair with my Bosch Smart Home Controller at 192.168.x.x — I'll press the button now"

4. **Press the physical button** on your controller
5. The assistant will call `bosch_pair` and store credentials locally

## Available Tools

| Tool | Description |
|------|-------------|
| `bosch_pair` | Pair with the controller (one-time setup) |
| `bosch_status` | Check if controller is reachable |
| `bosch_list_rooms` | List all rooms |
| `bosch_list_devices` | List all devices |
| `bosch_get_device` | Get details for a specific device |
| `bosch_get_device_services` | Get services/states for a device |
| `bosch_set_state` | Set a state on a device service |
| `bosch_list_scenarios` | List automation scenarios |
| `bosch_trigger_scenario` | Trigger a scenario |
| `bosch_get_alarm_state` | Get alarm system state |
| `bosch_arm_alarm` | Arm the alarm system |
| `bosch_disarm_alarm` | Disarm the alarm system |
| `bosch_list_messages` | List system messages/warnings |

## Example Usage

Once paired, just talk to your assistant naturally:

- *"Turn off the living room lights"*
- *"Set the bedroom thermostat to 19 degrees"*
- *"Close all shutters"*
- *"Arm the alarm system"*
- *"Run the 'Good Night' scenario"*
- *"Are any windows open?"*

## Local Development

```bash
git clone https://github.com/clemensv/openclaw-plugin-bosch-smarthome
cd openclaw-plugin-bosch-smarthome
npm install
npm run build
openclaw plugins build --entry ./dist/index.js
openclaw plugins validate --entry ./dist/index.js
```

## Based On

- [bosch-smart-home-bridge](https://github.com/holomekc/bosch-smart-home-bridge) — the excellent community library for the Bosch SHC local API
- [Bosch Smart Home Controller Local REST API](https://github.com/BoschSmartHome/bosch-shc-api-docs)

## License

MIT
