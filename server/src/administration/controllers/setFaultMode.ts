import type { IncomingMessage, ServerResponse } from "node:http"
import type { SetFaultModeRequest } from "@sensor/shared/protocol/administration"
import { faultModes, type FaultMode } from "@sensor/shared/protocol/telemetry"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { readJson, writeJson } from "../http/json"

function isFaultMode(value: unknown): value is FaultMode {
    return typeof value === "string" && faultModes.includes(value as FaultMode)
}

function isSetFaultModeRequest(value: unknown): value is SetFaultModeRequest {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const request = value as Record<string, unknown>
    return Object.keys(request).length === 1 && isFaultMode(request.faultMode)
}

export async function setFaultMode(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    try {
        const body = await readJson(request)

        if (!isSetFaultModeRequest(body)) {
            writeJson(response, 400, { error: "Invalid fault mode request" })
            return
        }

        writeJson(response, 200, controlPlane.setFaultMode(body.faultMode))
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Invalid fault mode request"
        writeJson(response, 400, { error: message })
    }
}
