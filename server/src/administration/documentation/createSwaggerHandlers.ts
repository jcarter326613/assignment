import { readFile } from "node:fs/promises"
import type { IncomingMessage, ServerResponse } from "node:http"
import { dirname, join } from "node:path"
import { createSwaggerDocument } from "./createSwaggerDocument"

const swaggerUiDirectory = dirname(require.resolve("swagger-ui-dist"))

const swaggerUiHtml = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sensor Administration Swagger</title>
        <link rel="stylesheet" href="/documentation/swagger-ui.css" />
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="/documentation/swagger-ui-bundle.js"></script>
        <script>
            SwaggerUIBundle({
                dom_id: "#swagger-ui",
                url: "/swagger.json"
            })
        </script>
    </body>
</html>`

function writeHtml(response: ServerResponse) {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    response.end(swaggerUiHtml)
}

async function writeAsset(
    response: ServerResponse,
    fileName: "swagger-ui.css" | "swagger-ui-bundle.js",
) {
    const content = await readFile(join(swaggerUiDirectory, fileName))
    const contentType =
        fileName === "swagger-ui.css"
            ? "text/css; charset=utf-8"
            : "application/javascript; charset=utf-8"

    response.writeHead(200, { "content-type": contentType })
    response.end(content)
}

export interface SwaggerHandlers {
    handle(request: IncomingMessage, response: ServerResponse): Promise<boolean>
}

export function createSwaggerHandlers(telemetryPort: number): SwaggerHandlers {
    const document = createSwaggerDocument(telemetryPort)

    return {
        handle: async (request, response) => {
            if (request.method !== "GET") {
                return false
            }

            const url = new URL(request.url ?? "/", "http://localhost")

            if (url.pathname === "/swagger.json") {
                response.writeHead(200, {
                    "content-type": "application/json; charset=utf-8",
                })
                response.end(JSON.stringify(document))
                return true
            }

            if (
                url.pathname === "/docs" ||
                url.pathname === "/docs/" ||
                url.pathname === "/swagger" ||
                url.pathname === "/swagger/"
            ) {
                writeHtml(response)
                return true
            }

            if (url.pathname === "/documentation/swagger-ui.css") {
                await writeAsset(response, "swagger-ui.css")
                return true
            }

            if (url.pathname === "/documentation/swagger-ui-bundle.js") {
                await writeAsset(response, "swagger-ui-bundle.js")
                return true
            }

            return false
        },
    }
}
