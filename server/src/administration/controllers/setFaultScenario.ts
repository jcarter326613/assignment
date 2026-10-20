import type { IncomingMessage, ServerResponse } from "node:http"
import type { SetFaultScenarioRequest } from "@sensor/shared/protocol/administration"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { readJson, writeJson } from "../http/json"

function isSetFaultScenarioRequest(
    value: unknown,
): value is SetFaultScenarioRequest {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const request = value as Record<string, unknown>
    return (
        Object.keys(request).length === 1 &&
        typeof request.scenarioId === "string"
    )
}

export async function setFaultScenario(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    try {
        const body = await readJson(request)

        if (!isSetFaultScenarioRequest(body)) {
            writeJson(response, 400, {
                error: "Invalid fault scenario request",
            })
            return
        }

        controlPlane.setFaultScenarioId(body.scenarioId)
        writeJson(response, 202, { scenarioId: body.scenarioId })
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Invalid fault scenario request"
        writeJson(response, 400, { error: message })
    }
}
