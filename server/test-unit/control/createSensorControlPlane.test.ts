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
        })
        expect(receivedConfigurations).toEqual([500])
    })

    test("rejects unsafe reporting intervals", () => {
        const controlPlane = createSensorControlPlane()

        expect(() => controlPlane.setReportingInterval(99)).toThrow(
            "reportingIntervalMs",
        )
    })

    test("notifies telemetry when a fault scenario is selected", () => {
        const controlPlane = createSensorControlPlane()
        const receivedScenarioIds: Array<string | undefined> = []
        controlPlane.subscribeFaultScenario((scenarioId) => {
            receivedScenarioIds.push(scenarioId)
        })

        controlPlane.setFaultScenarioId("hardware-error")

        expect(controlPlane.getFaultScenarioId()).toBe("hardware-error")
        expect(receivedScenarioIds).toEqual(["hardware-error"])
    })
})
