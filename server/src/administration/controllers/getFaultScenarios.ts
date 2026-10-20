import type { IncomingMessage, ServerResponse } from "node:http"
import { faultScenarios } from "../../control/faultScenarios"
import { writeJson } from "../http/json"

export function getFaultScenarios(response: ServerResponse<IncomingMessage>) {
    writeJson(response, 200, faultScenarios)
}
