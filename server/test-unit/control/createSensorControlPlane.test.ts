import { describe, expect, test } from "vitest"
import { createSensorControlPlane } from "../../src/control/createSensorControlPlane"

describe("createSensorControlPlane", () => {
    test("updates configuration and notifies telemetry subscribers", () => {
        const controlPlane = createSensorControlPlane()
        const receivedConfigurations: number[] = []
        controlPlane.subscribe((configuration) => {
            receivedConfigurations.push(configuration.reportingIntervalMs)
        })

        const configuration = controlPlane.updateConfiguration({
            reportingIntervalMs: 500,
        })

        expect(configuration).toEqual({
            reportingIntervalMs: 500,
            faultMode: "none",
        })
        expect(receivedConfigurations).toEqual([500])
    })

    test("rejects unsafe reporting intervals", () => {
        const controlPlane = createSensorControlPlane()

        expect(() =>
            controlPlane.updateConfiguration({ reportingIntervalMs: 99 }),
        ).toThrow("reportingIntervalMs")
    })
})
