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
    horizontalAccuracyMeters: 0.05,
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

function waitForFault(socket: WebSocket): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
        socket.once("error", reject)
        socket.on("message", (rawMessage) => {
            const event = JSON.parse(rawMessage.toString()) as {
                details?: { code?: string }
                type: string
            }

            if (
                event.type === "fault" &&
                typeof event.details?.code === "string"
            ) {
                resolve({ code: event.details.code })
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

    test("activates a selected fault scenario after two seconds", async () => {
        const controlPlane = createSensorControlPlane()
        const telemetryServer = createTelemetryServer(
            controlPlane,
            new FixedRouteLocationGenerator([fixtureLocation]),
            0,
        )
        servers.push(telemetryServer)
        await telemetryServer.start()

        const socket = new WebSocket(
            `ws://localhost:${telemetryServer.getPort()}`,
        )
        await waitForLocation(socket)
        const fault = waitForFault(socket)

        controlPlane.setFaultScenarioId("hardware-error")

        await expect(fault).resolves.toEqual({ code: "hardware-error" })
        socket.close()
    })
})
