import { createServer, type Server } from "node:http"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { createAdministrationRoutes } from "../routes/createAdministrationRoutes"

export interface AdministrationServer {
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

export function createAdministrationServer(
    controlPlane: SensorControlPlane,
    port: number,
    telemetryPort = 8081,
): AdministrationServer {
    const server = createServer(
        createAdministrationRoutes(controlPlane, telemetryPort),
    )

    return {
        start: () => listen(server, port),
        getPort: () => {
            const address = server.address()

            if (address === null || typeof address === "string") {
                throw new Error(
                    "Administration server is not listening on a TCP port",
                )
            }

            return address.port
        },
        close: () =>
            new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()))
            }),
    }
}
