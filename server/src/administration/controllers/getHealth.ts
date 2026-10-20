import type { IncomingMessage, ServerResponse } from "node:http"
import { writeJson } from "../http/json"

export function getHealth(response: ServerResponse<IncomingMessage>) {
    writeJson(response, 200, { status: "ok", service: "administration" })
}
