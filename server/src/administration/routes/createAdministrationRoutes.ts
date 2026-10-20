import type { IncomingMessage, ServerResponse } from "node:http"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { getConfiguration } from "../controllers/getConfiguration"
import { getHealth } from "../controllers/getHealth"
import { getPacketQuality } from "../controllers/getPacketQuality"
import { clearFaultScenario } from "../controllers/clearFaultScenario"
import { getFaultScenarios } from "../controllers/getFaultScenarios"
import { setFaultScenario } from "../controllers/setFaultScenario"
import { setReportingInterval } from "../controllers/setReportingInterval"
import { setBadPacketPercentage } from "../controllers/setBadPacketPercentage"
import { createSwaggerHandlers } from "../documentation/createSwaggerHandlers"
import { writeJson, writeOptions } from "../http/json"

export function createAdministrationRoutes(
    controlPlane: SensorControlPlane,
    telemetryPort: number,
) {
    const swaggerHandlers = createSwaggerHandlers(telemetryPort)

    return async (
        request: IncomingMessage,
        response: ServerResponse<IncomingMessage>,
    ) => {
        if (await swaggerHandlers.handle(request, response)) {
            return
        }

        const url = new URL(request.url ?? "/", "http://localhost")

        if (request.method === "OPTIONS") {
            writeOptions(response)
            return
        }

        if (request.method === "GET" && url.pathname === "/health") {
            getHealth(response)
            return
        }

        if (request.method === "GET" && url.pathname === "/configuration") {
            getConfiguration(response, controlPlane)
            return
        }

        if (
            request.method === "PUT" &&
            url.pathname === "/reporting-interval"
        ) {
            await setReportingInterval(request, response, controlPlane)
            return
        }

        if (request.method === "GET" && url.pathname === "/fault-scenarios") {
            getFaultScenarios(response)
            return
        }

        if (request.method === "GET" && url.pathname === "/packet-quality") {
            getPacketQuality(response, controlPlane)
            return
        }

        if (
            request.method === "PUT" &&
            url.pathname === "/bad-packet-percentage"
        ) {
            await setBadPacketPercentage(request, response, controlPlane)
            return
        }

        if (request.method === "PUT" && url.pathname === "/fault-scenario") {
            await setFaultScenario(request, response, controlPlane)
            return
        }

        if (request.method === "DELETE" && url.pathname === "/fault-scenario") {
            clearFaultScenario(response, controlPlane)
            return
        }

        writeJson(response, 404, { error: "Not found" })
    }
}
