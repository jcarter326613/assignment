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
    const server = createAdministrationServer(
        createSensorControlPlane(),
        0,
        9_081,
    )
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
        })

        const scenariosResponse = await fetch(`${url}/fault-scenarios`)
        const scenarios = (await scenariosResponse.json()) as Array<{
            id: string
        }>

        expect(scenariosResponse.status).toBe(200)
        expect(scenarios).toContainEqual(
            expect.objectContaining({ id: "hardware-error" }),
        )

        const faultResponse = await fetch(`${url}/fault-scenario`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ scenarioId: "hardware-error" }),
        })
        const scheduledFault = await faultResponse.json()

        expect(faultResponse.status).toBe(202)
        expect(scheduledFault).toEqual({ scenarioId: "hardware-error" })

        const packetQualityResponse = await fetch(`${url}/packet-quality`)
        expect(await packetQualityResponse.json()).toEqual({
            badPacketPercentage: 0,
        })

        const updatePacketQualityResponse = await fetch(
            `${url}/bad-packet-percentage`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ badPacketPercentage: 20 }),
            },
        )
        expect(updatePacketQualityResponse.status).toBe(200)
        expect(await updatePacketQualityResponse.json()).toEqual({
            badPacketPercentage: 20,
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

    test("serves Swagger documentation and UI aliases", async () => {
        const server = createTestServer()
        await server.start()
        const url = `http://localhost:${server.getPort()}`

        const documentResponse = await fetch(`${url}/swagger.json`)
        const document = (await documentResponse.json()) as {
            info: { description: string }
            openapi: string
            paths: Record<string, unknown>
        }
        const docsResponse = await fetch(`${url}/docs`)
        const docsSlashResponse = await fetch(`${url}/docs/`)
        const swaggerResponse = await fetch(`${url}/swagger`)
        const swaggerSlashResponse = await fetch(`${url}/swagger/`)
        const stylesheetResponse = await fetch(
            `${url}/documentation/swagger-ui.css`,
        )

        expect(documentResponse.status).toBe(200)
        expect(document.openapi).toBe("3.1.0")
        expect(document.paths).toMatchObject({
            "/configuration": expect.any(Object),
            "/fault-scenario": expect.any(Object),
            "/fault-scenarios": expect.any(Object),
            "/packet-quality": expect.any(Object),
            "/reporting-interval": expect.any(Object),
        })
        expect(document.info.description).toContain("ws://localhost:9081")
        expect(document.info.description).toContain('"type": "fault"')
        expect(docsResponse.status).toBe(200)
        expect(await docsResponse.text()).toContain("SwaggerUIBundle")
        expect(docsSlashResponse.status).toBe(200)
        expect(await docsSlashResponse.text()).toContain("SwaggerUIBundle")
        expect(swaggerResponse.status).toBe(200)
        expect(await swaggerResponse.text()).toContain("SwaggerUIBundle")
        expect(swaggerSlashResponse.status).toBe(200)
        expect(await swaggerSlashResponse.text()).toContain("SwaggerUIBundle")
        expect(stylesheetResponse.status).toBe(200)
        expect(stylesheetResponse.headers.get("content-type")).toContain(
            "text/css",
        )
    })
})
