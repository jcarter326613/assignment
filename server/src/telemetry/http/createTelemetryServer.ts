import { createServer, type Server } from "node:http"
import { WebSocketServer } from "ws"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import type { LocationGenerator } from "../location/LocationGenerator"
import { createTelemetryConnectionController } from "../controllers/handleTelemetryConnection"
import { createTelemetryRoutes } from "../routes/createTelemetryRoutes"
import { createTelemetryService } from "../services/TelemetryService"

export interface TelemetryServer {
    close(): Promise<void>
    getPort(): number
    start(): Promise<void>
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
    const httpServer = createServer(createTelemetryRoutes)
    const webSocketServer = new WebSocketServer({ server: httpServer })
    const telemetryService = createTelemetryService(
        controlPlane,
        locationGenerator,
    )
    const handleConnection =
        createTelemetryConnectionController(telemetryService)
    webSocketServer.on("connection", handleConnection)

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
                telemetryService.close()
                webSocketServer.clients.forEach((client) => client.terminate())
                webSocketServer.close(() => {
                    httpServer.close((error) =>
                        error ? reject(error) : resolve(),
                    )
                })
            }),
    }
}
