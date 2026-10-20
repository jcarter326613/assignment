import { once } from "node:events"
import { WebSocket } from "ws"
import { afterEach, describe, expect, test, vi } from "vitest"
import type { Location } from "@sensor/shared"
import { createSensorControlPlane } from "../../src/control/createSensorControlPlane"
import {
    createTelemetryServer,
    type TelemetryServer,
} from "../../src/telemetry/http/createTelemetryServer"
import { FixedRouteLocationGenerator } from "./location/fixtures/FixedRouteLocationGenerator"

const fixtureLocation: Location = {
    longitude: -81.69436,
    latitude: 41.49932,
    altitude: 199,
}

const servers: TelemetryServer[] = []

afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()))
})

function waitForLocation(
    socket: WebSocket,
): Promise<{ location: Location; timestampMs: number }> {
    return new Promise((resolve, reject) => {
        socket.once("error", reject)
        socket.on("message", (rawMessage) => {
            const event = JSON.parse(rawMessage.toString()) as {
                type: string
                location?: Location
                timestampMs?: number
            }

            if (
                event.type === "location" &&
                event.location !== undefined &&
                typeof event.timestampMs === "number"
            ) {
                resolve({
                    location: event.location,
                    timestampMs: event.timestampMs,
                })
            }
        })
    })
}

describe("createTelemetryServer", () => {
    test("broadcasts locations from its injected generator and powers it down", async () => {
        const controlPlane = createSensorControlPlane()
        const locationGenerator = new FixedRouteLocationGenerator([
            fixtureLocation,
        ])
        const telemetryServer = createTelemetryServer(
            controlPlane,
            locationGenerator,
            0,
        )
        servers.push(telemetryServer)
        await telemetryServer.start()

        const socket = new WebSocket(
            `ws://localhost:${telemetryServer.getPort()}`,
        )
        const event = await waitForLocation(socket)

        expect(event.location).toEqual(fixtureLocation)
        expect(Number.isInteger(event.timestampMs)).toBe(true)

        socket.close()
        await once(socket, "close")

        await vi.waitFor(() => {
            expect(locationGenerator.powerDownCalls).toBe(1)
        })
    })
})
