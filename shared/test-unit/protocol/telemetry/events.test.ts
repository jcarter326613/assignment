import { expect, test } from "vitest"
import type { FaultTelemetryEvent } from "../../../src/protocol/telemetry"

test("describes a server-reported fault", () => {
    const event = {
        type: "fault",
        details: {
            code: "poor-sky-visibility",
            description:
                "Satellite visibility is insufficient for a reliable position.",
        },
    } satisfies FaultTelemetryEvent

    expect(event.details.code).toBe("poor-sky-visibility")
})
