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

const FAULT_ACTIVATION_DELAY_MS = 2_000
const POOR_ACCURACY_METERS = 10
const TELEPORT_OFFSET_DEGREES = 0.01

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
    let faultActivationTimer: NodeJS.Timeout | undefined
    let activeFaultScenarioId: string | undefined
    let temporaryJumpSent = false
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
        if (activeFaultScenarioId === "hardware-error") {
            return
        }

        const timestampMs = Date.now()
        let location = locationGenerator.next(timestampMs)

        if (activeFaultScenarioId === "poor-location-accuracy") {
            location = {
                ...location,
                horizontalAccuracyMeters: POOR_ACCURACY_METERS,
            }
        }

        if (
            activeFaultScenarioId === "temporary-location-jump" &&
            !temporaryJumpSent
        ) {
            temporaryJumpSent = true
            location = {
                ...location,
                latitude: location.latitude + TELEPORT_OFFSET_DEGREES,
            }
        }

        if (activeFaultScenarioId === "persistent-teleportation") {
            location = {
                ...location,
                latitude: location.latitude + TELEPORT_OFFSET_DEGREES,
            }
        }

        broadcast({ type: "location", timestampMs, location })
    }

    function activateFaultScenario(scenarioId: string) {
        activeFaultScenarioId = scenarioId
        temporaryJumpSent = false

        if (scenarioId === "hardware-error") {
            broadcast({
                type: "fault",
                details: {
                    code: "hardware-error",
                    description:
                        "The sensor hardware cannot generate a location.",
                },
            })
        }

        if (scenarioId === "poor-location-accuracy") {
            broadcast({
                type: "fault",
                details: {
                    code: "poor-location-accuracy",
                    description:
                        "Location accuracy has fallen below a reliable level.",
                },
            })
        }
    }

    function scheduleFaultScenario(scenarioId: string | undefined) {
        if (faultActivationTimer !== undefined) {
            clearTimeout(faultActivationTimer)
            faultActivationTimer = undefined
        }

        activeFaultScenarioId = undefined
        temporaryJumpSent = false

        if (scenarioId !== undefined) {
            faultActivationTimer = setTimeout(() => {
                faultActivationTimer = undefined
                activateFaultScenario(scenarioId)
            }, FAULT_ACTIVATION_DELAY_MS)
        }
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
    const unsubscribeFaultScenario = controlPlane.subscribeFaultScenario(
        scheduleFaultScenario,
    )

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
            unsubscribeFaultScenario()
            stopReporting()
            scheduleFaultScenario(undefined)
            powerDownGenerator()
            connectedSockets.clear()
        },
    }
}
