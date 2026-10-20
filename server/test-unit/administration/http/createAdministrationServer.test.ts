import { afterEach, describe, expect, test } from "vitest"
import {
    createAdministrationServer,
    type AdministrationServer,
} from "../../../src/administration/http/createAdministrationServer"
import { createSensorControlPlane } from "../../../src/control/createSensorControlPlane"

const servers: AdministrationServer[] = []

afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()))
})

function createTestServer() {
    const server = createAdministrationServer(createSensorControlPlane(), 0)
    servers.push(server)
    return server
}

describe("createAdministrationServer", () => {
    test("changes one configuration setting per command", async () => {
        const server = createTestServer()
        await server.start()
        const url = `http://localhost:${server.getPort()}`

        const intervalResponse = await fetch(`${url}/reporting-interval`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reportingIntervalMs: 500 }),
        })
        const intervalConfiguration = await intervalResponse.json()

        expect(intervalResponse.status).toBe(200)
        expect(intervalConfiguration).toEqual({
            reportingIntervalMs: 500,
            faultMode: "none",
        })

        const faultResponse = await fetch(`${url}/fault-mode`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ faultMode: "stale-data" }),
        })
        const faultConfiguration = await faultResponse.json()

        expect(faultResponse.status).toBe(200)
        expect(faultConfiguration).toEqual({
            reportingIntervalMs: 500,
            faultMode: "stale-data",
        })
    })

    test("does not expose the former combined configuration update route", async () => {
        const server = createTestServer()
        await server.start()

        const response = await fetch(
            `http://localhost:${server.getPort()}/configuration`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reportingIntervalMs: 500 }),
            },
        )

        expect(response.status).toBe(404)
    })
})
