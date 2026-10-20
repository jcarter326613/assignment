import { WebSocket } from "ws"
import type {
    ConfigurationTelemetryEvent,
    FaultTelemetryEvent,
    LocationTelemetryEvent,
    TelemetryConnectedEvent,
    TelemetryEvent,
} from "@sensor/shared/protocol/telemetry"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import type { LocationGenerator } from "../location/LocationGenerator"

export interface TelemetryService {
    close(): void
    handleConnection(socket: WebSocket): void
}

function sendJson(socket: WebSocket, event: TelemetryEvent) {
    socket.send(JSON.stringify(event))
}

export function createTelemetryService(
    controlPlane: SensorControlPlane,
    locationGenerator: LocationGenerator,
): TelemetryService {
    const connectedSockets = new Set<WebSocket>()
    let reportingTimer: NodeJS.Timeout | undefined
    let isGeneratorPoweredDown = false

    function broadcast(
        event:
            | ConfigurationTelemetryEvent
            | FaultTelemetryEvent
            | LocationTelemetryEvent,
    ) {
        connectedSockets.forEach((socket) => {
            if (socket.readyState === WebSocket.OPEN) {
                sendJson(socket, event)
            }
        })
    }

    function reportLocation() {
        const timestampMs = Date.now()
        const location = locationGenerator.next(timestampMs)
        broadcast({ type: "location", timestampMs, location })
    }

    function stopReporting() {
        if (reportingTimer !== undefined) {
            clearInterval(reportingTimer)
            reportingTimer = undefined
        }
    }

    function powerDownGenerator() {
        if (!isGeneratorPoweredDown) {
            locationGenerator.powerDown()
            isGeneratorPoweredDown = true
        }
    }

    function scheduleReporting() {
        stopReporting()

        if (connectedSockets.size > 0) {
            reportingTimer = setInterval(
                reportLocation,
                controlPlane.getConfiguration().reportingIntervalMs,
            )
        }
    }

    const unsubscribe = controlPlane.subscribe((configuration) => {
        const event: ConfigurationTelemetryEvent = {
            type: "configuration",
            configuration,
        }
        broadcast(event)
        scheduleReporting()
    })

    return {
        handleConnection: (socket) => {
            connectedSockets.add(socket)
            const event: TelemetryConnectedEvent = {
                type: "telemetry-connected",
                configuration: controlPlane.getConfiguration(),
            }
            sendJson(socket, event)

            if (connectedSockets.size === 1) {
                isGeneratorPoweredDown = false
                reportLocation()
                scheduleReporting()
            }

            socket.on("close", () => {
                connectedSockets.delete(socket)

                if (connectedSockets.size === 0) {
                    stopReporting()
                    powerDownGenerator()
                }
            })
        },
        close: () => {
            unsubscribe()
            stopReporting()
            powerDownGenerator()
            connectedSockets.clear()
        },
    }
}
