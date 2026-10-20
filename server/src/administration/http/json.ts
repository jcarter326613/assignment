import type { IncomingMessage, ServerResponse } from "node:http"

const corsHeaders = {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-allow-origin": "http://localhost:5173",
}

export function writeJson(
    response: ServerResponse<IncomingMessage>,
    statusCode: number,
    body: unknown,
) {
    response.writeHead(statusCode, {
        ...corsHeaders,
        "content-type": "application/json",
    })
    response.end(JSON.stringify(body))
}

export function writeOptions(response: ServerResponse<IncomingMessage>) {
    response.writeHead(204, corsHeaders)
    response.end()
}

export function readJson(request: IncomingMessage): Promise<unknown> {
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
