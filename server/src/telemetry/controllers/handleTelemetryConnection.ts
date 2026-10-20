import type { WebSocket } from "ws"
import type { TelemetryService } from "../services/TelemetryService"

export function createTelemetryConnectionController(
    telemetryService: TelemetryService,
) {
    return (socket: WebSocket) => telemetryService.handleConnection(socket)
}
