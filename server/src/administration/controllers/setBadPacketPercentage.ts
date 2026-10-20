import type { IncomingMessage, ServerResponse } from "node:http"
import type { SetBadPacketPercentageRequest } from "@sensor/shared/protocol/administration"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { readJson, writeJson } from "../http/json"

function isSetBadPacketPercentageRequest(
    value: unknown,
): value is SetBadPacketPercentageRequest {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const request = value as Record<string, unknown>
    return (
        Object.keys(request).length === 1 &&
        typeof request.badPacketPercentage === "number"
    )
}

export async function setBadPacketPercentage(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    try {
        const body = await readJson(request)

        if (!isSetBadPacketPercentageRequest(body)) {
            writeJson(response, 400, {
                error: "Invalid packet quality request",
            })
            return
        }

        writeJson(
            response,
            200,
            controlPlane.setBadPacketPercentage(body.badPacketPercentage),
        )
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Invalid packet quality request"
        writeJson(response, 400, { error: message })
    }
}
