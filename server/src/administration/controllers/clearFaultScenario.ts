import type { IncomingMessage, ServerResponse } from "node:http"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { writeJson } from "../http/json"

export function clearFaultScenario(
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    controlPlane.setFaultScenarioId(undefined)
    writeJson(response, 200, { status: "normal" })
}
