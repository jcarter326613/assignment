import type { IncomingMessage, ServerResponse } from "node:http"
import type { SensorControlPlane } from "../../control/createSensorControlPlane"
import { writeJson } from "../http/json"

export function getConfiguration(
    response: ServerResponse<IncomingMessage>,
    controlPlane: SensorControlPlane,
) {
    writeJson(response, 200, controlPlane.getConfiguration())
}
