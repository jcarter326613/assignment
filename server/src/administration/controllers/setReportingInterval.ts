import type { IncomingMessage, ServerResponse } from "node:http"
import type { SetReportingIntervalRequest } from "@sensor/shared/protocol/administration"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { readJson, writeJson } from "../http/json"

function isSetReportingIntervalRequest(
    value: unknown,
): value is SetReportingIntervalRequest {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const request = value as Record<string, unknown>
    return (
        Object.keys(request).length === 1 &&
        typeof request.reportingIntervalMs === "number"
    )
}

export async function setReportingInterval(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    try {
        const body = await readJson(request)

        if (!isSetReportingIntervalRequest(body)) {
            writeJson(response, 400, {
                error: "Invalid reporting interval request",
            })
            return
        }

        writeJson(
            response,
            200,
            controlPlane.setReportingInterval(body.reportingIntervalMs),
        )
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Invalid reporting interval request"
        writeJson(response, 400, { error: message })
    }
}
