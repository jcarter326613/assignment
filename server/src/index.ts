import { createAdministrationServer } from "./administration/http/createAdministrationServer"
import { createSensorControlPlane } from "./control/createSensorControlPlane"
import { createTelemetryServer } from "./telemetry/http/createTelemetryServer"
import { RandomWalkLocationGenerator } from "./telemetry/location/RandomWalkLocationGenerator"

function readPort(value: string | undefined, fallback: number) {
    const port = Number(value ?? fallback)

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new RangeError("Ports must be integers between 1 and 65535")
    }

    return port
}

const telemetryPort = readPort(process.env.TELEMETRY_PORT, 8081)
const administrationPort = readPort(process.env.ADMINISTRATION_PORT, 8080)
const controlPlane = createSensorControlPlane()
const locationGenerator = new RandomWalkLocationGenerator()
const telemetryServer = createTelemetryServer(
    controlPlane,
    locationGenerator,
    telemetryPort,
)
const administrationServer = createAdministrationServer(
    controlPlane,
    administrationPort,
)

async function start() {
    await telemetryServer.start()

    try {
        await administrationServer.start()
    } catch (error) {
        await telemetryServer.close()
        throw error
    }

    console.log(
        `Telemetry WebSocket listening on ws://localhost:${telemetryPort}`,
    )
    console.log(
        `Administration REST API listening on http://localhost:${administrationPort}`,
    )
}

let stopping = false

async function stop() {
    if (stopping) {
        return
    }

    stopping = true
    await Promise.all([telemetryServer.close(), administrationServer.close()])
}

process.once("SIGINT", () => void stop())
process.once("SIGTERM", () => void stop())

void start().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
