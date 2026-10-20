import type { ServerResponse } from "node:http"

export function getHealth(response: ServerResponse) {
    response.writeHead(200, { "content-type": "application/json" })
    response.end(JSON.stringify({ status: "ok", service: "telemetry" }))
}
