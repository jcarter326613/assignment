import {
    createServer,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from "node:http"
import type { FaultMode, SensorConfigurationUpdate } from "@sensor/shared"
import type { SensorControlPlane } from "../control/createSensorControlPlane"

export interface AdministrationServer {
    close(): Promise<void>
    start(): Promise<void>
}

function listen(server: Server, port: number) {
    return new Promise<void>((resolve, reject) => {
        server.once("error", reject)
        server.listen(port, () => {
            server.off("error", reject)
            resolve()
        })
    })
}

function writeJson(
    response: ServerResponse<IncomingMessage>,
    statusCode: number,
    body: unknown,
) {
    response.writeHead(statusCode, {
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,PUT,OPTIONS",
        "access-control-allow-origin": "http://localhost:5173",
        "content-type": "application/json",
    })
    response.end(JSON.stringify(body))
}

function readJson(request: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []

        request.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        request.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString()))
            } catch {
                reject(new SyntaxError("Request body must be valid JSON"))
            }
        })
        request.on("error", reject)
    })
}

function isFaultMode(value: unknown): value is FaultMode {
    return (
        value === "none" ||
        value === "invalid-location" ||
        value === "offline" ||
        value === "stale-data"
    )
}

function isConfigurationUpdate(
    value: unknown,
): value is SensorConfigurationUpdate {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const update = value as Record<string, unknown>
    const keys = Object.keys(update)
    const validKeys = keys.every(
        (key) => key === "reportingIntervalMs" || key === "faultMode",
    )

    return (
        keys.length > 0 &&
        validKeys &&
        (update.reportingIntervalMs === undefined ||
            typeof update.reportingIntervalMs === "number") &&
        (update.faultMode === undefined || isFaultMode(update.faultMode))
    )
}

export function createAdministrationServer(
    controlPlane: SensorControlPlane,
    port: number,
): AdministrationServer {
    const server = createServer(async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost")

        if (request.method === "OPTIONS") {
            response.writeHead(204, {
                "access-control-allow-headers": "content-type",
                "access-control-allow-methods": "GET,PUT,OPTIONS",
                "access-control-allow-origin": "http://localhost:5173",
            })
            response.end()
            return
        }

        if (request.method === "GET" && url.pathname === "/health") {
            writeJson(response, 200, {
                status: "ok",
                service: "administration",
            })
            return
        }

        if (request.method === "GET" && url.pathname === "/configuration") {
            writeJson(response, 200, controlPlane.getConfiguration())
            return
        }

        if (request.method === "PUT" && url.pathname === "/configuration") {
            try {
                const update = await readJson(request)

                if (!isConfigurationUpdate(update)) {
                    writeJson(response, 400, {
                        error: "Invalid configuration update",
                    })
                    return
                }

                writeJson(
                    response,
                    200,
                    controlPlane.updateConfiguration(update),
                )
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Invalid configuration update"
                writeJson(response, 400, { error: message })
            }
            return
        }

        writeJson(response, 404, { error: "Not found" })
    })

    return {
        start: () => listen(server, port),
        close: () =>
            new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()))
            }),
    }
}
