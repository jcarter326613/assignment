import {
    faultModes,
    type SensorConfiguration,
} from "@sensor/shared/protocol/telemetry"
import type {
    SetFaultModeRequest,
    SetReportingIntervalRequest,
} from "@sensor/shared/protocol/administration"

type Schema = Record<string, unknown>

const faultModeSchema = {
    type: "string",
    enum: faultModes,
    example: "stale-data",
}

const reportingIntervalSchema = {
    type: "integer",
    minimum: 100,
    example: 500,
}

const sensorConfigurationProperties = {
    reportingIntervalMs: reportingIntervalSchema,
    faultMode: { $ref: "#/components/schemas/FaultMode" },
} satisfies Record<keyof SensorConfiguration, Schema>

const setReportingIntervalProperties = {
    reportingIntervalMs: reportingIntervalSchema,
} satisfies Record<keyof SetReportingIntervalRequest, Schema>

const setFaultModeProperties = {
    faultMode: { $ref: "#/components/schemas/FaultMode" },
} satisfies Record<keyof SetFaultModeRequest, Schema>

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
    "reportingIntervalMs": 1000,
    "faultMode": "none"
  }
}
\`\`\`

\`configuration\` is broadcast after an administration command updates sensor
configuration:

\`\`\`json
{
  "type": "configuration",
  "configuration": {
    "reportingIntervalMs": 500,
    "faultMode": "stale-data"
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

\`timestampMs\` is a Unix epoch timestamp in milliseconds. Clients must retain
only the newest location and silently discard a location packet whose timestamp
is not newer than the latest accepted packet.`
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
            "/fault-mode": {
                put: {
                    summary: "Set the sensor fault mode",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SetFaultModeRequest",
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
                            description: "Invalid fault mode request",
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
                FaultMode: faultModeSchema,
                SensorConfiguration: {
                    type: "object",
                    required: ["reportingIntervalMs", "faultMode"],
                    properties: sensorConfigurationProperties,
                },
                SetFaultModeRequest: {
                    type: "object",
                    required: ["faultMode"],
                    properties: setFaultModeProperties,
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
