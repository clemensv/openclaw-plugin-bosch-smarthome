import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import {
  BoschSmartHomeBridgeBuilder,
  BshbUtils,
} from "bosch-smart-home-bridge";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Credentials storage (local, never in repo)
// ---------------------------------------------------------------------------

const CREDS_DIR = path.join(os.homedir(), ".openclaw", "bosch-smarthome");
const CREDS_FILE = path.join(CREDS_DIR, "credentials.json");

interface Credentials {
  host: string;
  cert: string;
  key: string;
  identifier: string;
}

function loadCreds(): Credentials | null {
  try {
    if (!fs.existsSync(CREDS_FILE)) return null;
    return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveCreds(creds: Credentials) {
  fs.mkdirSync(CREDS_DIR, { recursive: true });
  fs.chmodSync(CREDS_DIR, 0o700);
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Build a connected client from stored credentials
// ---------------------------------------------------------------------------

function buildClient(creds: Credentials) {
  return BoschSmartHomeBridgeBuilder.builder()
    .withHost(creds.host)
    .withClientCert(creds.cert)
    .withClientPrivateKey(creds.key)
    .build()
    .getBshcClient();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rxToPromise<T>(observable: { subscribe: Function }): Promise<T> {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: (v: T) => resolve(v),
      error: (e: unknown) => reject(e),
    });
  });
}

async function clientCall<T>(fn: (client: ReturnType<typeof buildClient>) => { subscribe: Function }): Promise<T> {
  const creds = loadCreds();
  if (!creds) throw new Error("Not paired. Run bosch_pair first.");
  const client = buildClient(creds);
  const result = await rxToPromise<any>(fn(client));
  return result?.parsedResponse ?? result;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default defineToolPlugin({
  id: "bosch-smarthome",
  name: "Bosch Smart Home",
  description: "Control and monitor Bosch Smart Home devices via the local REST API.",
  configSchema: Type.Object({}),
  tools: (tool) => [
    // ------------------------------------------------------------------
    // Pairing
    // ------------------------------------------------------------------
    tool({
      name: "bosch_pair",
      description:
        "Pair with the Bosch Smart Home Controller. Press the physical button on the controller before calling this tool. Stores credentials locally (never in any repo).",
      parameters: Type.Object({
        host: Type.String({ description: "IP address or hostname of the controller." }),
        system_password: Type.String({ description: "System password of the controller." }),
        client_name: Type.Optional(Type.String({ description: "Name shown in the Bosch app. Defaults to 'OpenClaw'." })),
      }),
      execute: async ({ host, system_password, client_name }) => {
        const certPair = await BshbUtils.generateClientCertificate();
        const identifier = BshbUtils.generateIdentifier();
        const name = client_name ?? "OpenClaw";

        const bshb = BoschSmartHomeBridgeBuilder.builder()
          .withHost(host)
          .withClientCert(certPair.cert)
          .withClientPrivateKey(certPair.private)
          .build();

        await rxToPromise(bshb.pairIfNeeded(name, identifier, system_password));

        saveCreds({ host, cert: certPair.cert, key: certPair.private, identifier });
        return { success: true, message: `Paired as '${name}'. Credentials stored locally.` };
      },
    }),

    // ------------------------------------------------------------------
    // Rooms
    // ------------------------------------------------------------------
    tool({
      name: "bosch_list_rooms",
      description: "List all rooms defined in the Bosch Smart Home system.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.getRooms());
      },
    }),

    // ------------------------------------------------------------------
    // Devices
    // ------------------------------------------------------------------
    tool({
      name: "bosch_list_devices",
      description: "List all paired devices in the Bosch Smart Home system.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.getDevices());
      },
    }),

    tool({
      name: "bosch_get_device",
      description: "Get details for a specific device by ID.",
      parameters: Type.Object({
        device_id: Type.String({ description: "The device ID." }),
      }),
      execute: async ({ device_id }) => {
        return clientCall((c) => c.getDevice(device_id));
      },
    }),

    // ------------------------------------------------------------------
    // Device Services / States
    // ------------------------------------------------------------------
    tool({
      name: "bosch_get_device_services",
      description: "Get all services (and their current states) for a device.",
      parameters: Type.Object({
        device_id: Type.String({ description: "The device ID." }),
      }),
      execute: async ({ device_id }) => {
        return clientCall((c) => c.getDeviceServices(device_id, "all"));
      },
    }),

    tool({
      name: "bosch_set_state",
      description:
        "Set a state on a device service. E.g. turn a light on/off, set a thermostat temperature, open/close a shutter.",
      parameters: Type.Object({
        device_id: Type.String({ description: "The device ID." }),
        service_id: Type.String({ description: "The service ID, e.g. 'PowerSwitch', 'Thermostat', 'ShutterControl'." }),
        state: Type.Record(Type.String(), Type.Unknown(), { description: "State object, e.g. {\"switchState\": \"ON\"} or {\"setpointTemperature\": 21.5}." }),
      }),
      execute: async ({ device_id, service_id, state }) => {
        return clientCall((c) => c.putState(`devices/${device_id}/services/${service_id}`, state));
      },
    }),

    // ------------------------------------------------------------------
    // Scenarios
    // ------------------------------------------------------------------
    tool({
      name: "bosch_list_scenarios",
      description: "List all automation scenarios.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.getScenarios());
      },
    }),

    tool({
      name: "bosch_trigger_scenario",
      description: "Trigger a scenario by ID.",
      parameters: Type.Object({
        scenario_id: Type.String({ description: "The scenario ID." }),
      }),
      execute: async ({ scenario_id }) => {
        return clientCall((c) => c.triggerScenario(scenario_id));
      },
    }),

    // ------------------------------------------------------------------
    // Intrusion Detection
    // ------------------------------------------------------------------
    tool({
      name: "bosch_get_alarm_state",
      description: "Get the current intrusion detection / alarm system state.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.getIntrusionDetectionSystemState());
      },
    }),

    tool({
      name: "bosch_arm_alarm",
      description: "Arm the intrusion detection system.",
      parameters: Type.Object({
        profile_id: Type.Optional(Type.String({ description: "Arm profile ID (optional)." })),
      }),
      execute: async ({ profile_id }) => {
        return clientCall((c) =>
          profile_id
            ? c.armIntrusionDetectionSystem(parseInt(profile_id, 10))
            : c.armIntrusionDetectionSystem()
        );
      },
    }),

    tool({
      name: "bosch_disarm_alarm",
      description: "Disarm the intrusion detection system.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.disarmIntrusionDetectionSystem());
      },
    }),

    // ------------------------------------------------------------------
    // Messages / Notifications
    // ------------------------------------------------------------------
    tool({
      name: "bosch_list_messages",
      description: "List current system messages (errors, warnings, info) from the controller.",
      parameters: Type.Object({}),
      execute: async () => {
        return clientCall((c) => c.getMessages());
      },
    }),

    // ------------------------------------------------------------------
    // Status
    // ------------------------------------------------------------------
    tool({
      name: "bosch_status",
      description: "Check if the controller is reachable and return public info (no auth required).",
      parameters: Type.Object({
        host: Type.Optional(Type.String({ description: "Override host (uses stored credentials host if omitted)." })),
      }),
      execute: async ({ host }) => {
        const creds = loadCreds();
        const targetHost = host ?? creds?.host;
        if (!targetHost) throw new Error("No host provided and no stored credentials found.");

        const bshb = BoschSmartHomeBridgeBuilder.builder()
          .withHost(targetHost)
          .withClientCert(creds?.cert ?? "")
          .withClientPrivateKey(creds?.key ?? "")
          .build();

        const info = await rxToPromise<any>(bshb.getBshcClient().getInformation());
        return info?.parsedResponse ?? info;
      },
    }),
  ],
});
