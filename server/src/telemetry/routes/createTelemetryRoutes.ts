import type { IncomingMessage, ServerResponse } from "node:http"
import { getHealth } from "../controllers/getHealth"

export function createTelemetryRoutes(
    request: IncomingMessage,
    response: ServerResponse,
) {
    if (request.method === "GET" && request.url === "/health") {
        getHealth(response)
        return
    }

    response.writeHead(404)
    response.end()
}
