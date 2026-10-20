import {
    type FaultDetails,
    type SensorConfiguration,
} from "@sensor/shared/protocol/telemetry"
import type {
    FaultScenario,
    SetFaultScenarioRequest,
    SetReportingIntervalRequest,
} from "@sensor/shared/protocol/administration"

type Schema = Record<string, unknown>

const reportingIntervalSchema = {
    type: "integer",
    minimum: 100,
    example: 500,
}

const sensorConfigurationProperties = {
    reportingIntervalMs: reportingIntervalSchema,
} satisfies Record<keyof SensorConfiguration, Schema>

const setReportingIntervalProperties = {
    reportingIntervalMs: reportingIntervalSchema,
} satisfies Record<keyof SetReportingIntervalRequest, Schema>

const faultScenarioProperties = {
    id: { type: "string", example: "hardware-error" },
    label: { type: "string", example: "Simulate hardware error" },
} satisfies Record<keyof FaultScenario, Schema>

const setFaultScenarioProperties = {
    scenarioId: { type: "string", example: "hardware-error" },
} satisfies Record<keyof SetFaultScenarioRequest, Schema>

const faultDetailsProperties = {
    code: {
        type: "string",
        example: "poor-sky-visibility",
    },
    description: {
        type: "string",
        example:
            "Satellite visibility is insufficient for a reliable position.",
    },
} satisfies Record<keyof FaultDetails, Schema>

function telemetryDescription(telemetryPort: number) {
    return `## Realtime telemetry

Connect a WebSocket client to \`ws://localhost:${telemetryPort}\`. The first
connected client starts location reporting. A client joining an active stream
receives only future reports; previous locations are not replayed.

### Packet types

\`telemetry-connected\` is sent after a successful connection:

\`\`\`json
{
  "type": "telemetry-connected",
  "configuration": {
    "reportingIntervalMs": 200
  }
}
\`\`\`

\`configuration\` is broadcast after an administration command updates sensor
configuration:

\`\`\`json
{
  "type": "configuration",
  "configuration": {
    "reportingIntervalMs": 500
  }
}
\`\`\`

\`location\` is sent at the configured reporting interval:

\`\`\`json
{
  "type": "location",
  "timestampMs": 1760967395123,
  "location": {
    "longitude": -81.69436,
    "latitude": 41.49932,
    "altitude": 199
  }
}
\`\`\`

\`fault\` is an explicit server-reported fault:

\`\`\`json
{
  "type": "fault",
  "details": {
    "code": "poor-sky-visibility",
    "description": "Satellite visibility is insufficient for a reliable position."
  }
}
\`\`\`

\`timestampMs\` is a Unix epoch timestamp in milliseconds. Clients must retain
only the newest location and silently discard a location packet whose timestamp
is not newer than the latest accepted packet. Fault packets supplement client
checks; for example, a simulated power loss may stop telemetry entirely, which
the client must detect from missing reports.`
}

export function createSwaggerDocument(telemetryPort: number) {
    return {
        openapi: "3.1.0",
        info: {
            title: "Sensor Administration Swagger",
            version: "0.1.0",
            description: telemetryDescription(telemetryPort),
        },
        servers: [{ url: "/" }],
        paths: {
            "/health": {
                get: {
                    summary: "Check administration service health",
                    responses: {
                        "200": {
                            description: "Administration service is available",
                        },
                    },
                },
            },
            "/configuration": {
                get: {
                    summary: "Read the current sensor configuration",
                    responses: {
                        "200": {
                            description: "Current sensor configuration",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/SensorConfiguration",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "/reporting-interval": {
                put: {
                    summary: "Set the telemetry reporting interval",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SetReportingIntervalRequest",
                                },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Updated sensor configuration",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/SensorConfiguration",
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Invalid reporting interval request",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Error",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "/fault-scenarios": {
                get: {
                    summary: "List available server fault scenarios",
                    responses: {
                        "200": {
                            description: "Server-owned fault scenario menu",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "array",
                                        items: {
                                            $ref: "#/components/schemas/FaultScenario",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "/fault-scenario": {
                put: {
                    summary: "Schedule a server fault scenario",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SetFaultScenarioRequest",
                                },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description:
                                "Scenario is scheduled for activation in two seconds",
                            content: {
                                "application/json": {
                                    schema: { type: "object" },
                                },
                            },
                        },
                        "400": {
                            description: "Invalid fault scenario request",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Error",
                                    },
                                },
                            },
                        },
                    },
                },
                delete: {
                    summary: "Resume normal sensor behavior",
                    responses: {
                        "200": {
                            description: "Pending or active scenario cleared",
                        },
                    },
                },
            },
        },
        components: {
            schemas: {
                Error: {
                    type: "object",
                    required: ["error"],
                    properties: {
                        error: { type: "string" },
                    },
                },
                FaultDetails: {
                    type: "object",
                    required: ["code", "description"],
                    properties: faultDetailsProperties,
                },
                SensorConfiguration: {
                    type: "object",
                    required: ["reportingIntervalMs"],
                    properties: sensorConfigurationProperties,
                },
                FaultScenario: {
                    type: "object",
                    required: ["id", "label"],
                    properties: faultScenarioProperties,
                },
                SetFaultScenarioRequest: {
                    type: "object",
                    required: ["scenarioId"],
                    properties: setFaultScenarioProperties,
                },
                SetReportingIntervalRequest: {
                    type: "object",
                    required: ["reportingIntervalMs"],
                    properties: setReportingIntervalProperties,
                },
            },
        },
    }
}
