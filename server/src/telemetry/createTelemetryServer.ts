import { createServer, type Server } from "node:http"
import { WebSocket, WebSocketServer } from "ws"
import type {
    ConfigurationTelemetryEvent,
    LocationTelemetryEvent,
    TelemetryConnectedEvent,
    TelemetryEvent,
} from "@sensor/shared"
import type { SensorControlPlane } from "../control/createSensorControlPlane"
import type { LocationGenerator } from "../location/LocationGenerator"

export interface TelemetryServer {
    close(): Promise<void>
    getPort(): number
    start(): Promise<void>
}

function sendJson(socket: WebSocket, event: TelemetryEvent) {
    socket.send(JSON.stringify(event))
}

function listen(server: Server, port: number) {
    return new Promise<void>((resolve, reject) => {
        server.once("error", reject)
        server.listen(port, () => {
            server.off("error", reject)
            resolve()
        })
    })
}

export function createTelemetryServer(
    controlPlane: SensorControlPlane,
    locationGenerator: LocationGenerator,
    port: number,
): TelemetryServer {
    const httpServer = createServer((request, response) => {
        if (request.method === "GET" && request.url === "/health") {
            response.writeHead(200, { "content-type": "application/json" })
            response.end(JSON.stringify({ status: "ok", service: "telemetry" }))
            return
        }

        response.writeHead(404)
        response.end()
    })
    const webSocketServer = new WebSocketServer({ server: httpServer })
    const connectedSockets = new Set<WebSocket>()
    let reportingTimer: NodeJS.Timeout | undefined
    let isGeneratorPoweredDown = false

    function broadcast(
        event: ConfigurationTelemetryEvent | LocationTelemetryEvent,
    ) {
        webSocketServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                sendJson(client, event)
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

    webSocketServer.on("connection", (socket) => {
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
    })

    return {
        start: () => listen(httpServer, port),
        getPort: () => {
            const address = httpServer.address()

            if (address === null || typeof address === "string") {
                throw new Error(
                    "Telemetry server is not listening on a TCP port",
                )
            }

            return address.port
        },
        close: () =>
            new Promise((resolve, reject) => {
                unsubscribe()
                stopReporting()
                powerDownGenerator()
                connectedSockets.clear()
                webSocketServer.clients.forEach((client) => client.terminate())
                webSocketServer.close(() => {
                    httpServer.close((error) =>
                        error ? reject(error) : resolve(),
                    )
                })
            }),
    }
}
