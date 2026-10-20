import { describe, expect, test } from "vitest"
import { createSensorControlPlane } from "../../src/control/createSensorControlPlane"

describe("createSensorControlPlane", () => {
    test("updates configuration and notifies telemetry subscribers", () => {
        const controlPlane = createSensorControlPlane()
        const receivedConfigurations: number[] = []
        controlPlane.subscribe((configuration) => {
            receivedConfigurations.push(configuration.reportingIntervalMs)
        })

        const configuration = controlPlane.setReportingInterval(500)

        expect(configuration).toEqual({
            reportingIntervalMs: 500,
            faultMode: "none",
        })
        expect(receivedConfigurations).toEqual([500])
    })

    test("rejects unsafe reporting intervals", () => {
        const controlPlane = createSensorControlPlane()

        expect(() => controlPlane.setReportingInterval(99)).toThrow(
            "reportingIntervalMs",
        )
    })

    test("changes the fault mode independently of the reporting interval", () => {
        const controlPlane = createSensorControlPlane()

        const configuration = controlPlane.setFaultMode("stale-data")

        expect(configuration).toEqual({
            reportingIntervalMs: 1_000,
            faultMode: "stale-data",
        })
    })
})
