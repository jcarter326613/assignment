import type { SensorConfiguration } from "@sensor/shared/protocol/telemetry"
import { isFaultScenarioId } from "./faultScenarios"

export interface SensorControlPlane {
    getConfiguration(): SensorConfiguration
    getFaultScenarioId(): string | undefined
    setReportingInterval(reportingIntervalMs: number): SensorConfiguration
    setFaultScenarioId(scenarioId: string | undefined): void
    subscribe(
        listener: (configuration: SensorConfiguration) => void,
    ): () => void
    subscribeFaultScenario(
        listener: (scenarioId: string | undefined) => void,
    ): () => void
}

const defaultConfiguration: SensorConfiguration = {
    reportingIntervalMs: 200,
}

export function createSensorControlPlane(): SensorControlPlane {
    let configuration = defaultConfiguration
    let faultScenarioId: string | undefined
    const listeners = new Set<(configuration: SensorConfiguration) => void>()
    const faultScenarioListeners = new Set<
        (scenarioId: string | undefined) => void
    >()

    return {
        getConfiguration: () => configuration,
        getFaultScenarioId: () => faultScenarioId,
        setReportingInterval: (reportingIntervalMs) => {
            if (
                !Number.isInteger(reportingIntervalMs) ||
                reportingIntervalMs < 100
            ) {
                throw new RangeError(
                    "reportingIntervalMs must be an integer of at least 100",
                )
            }

            configuration = { ...configuration, reportingIntervalMs }
            listeners.forEach((listener) => listener(configuration))
            return configuration
        },
        setFaultScenarioId: (scenarioId) => {
            if (scenarioId !== undefined && !isFaultScenarioId(scenarioId)) {
                throw new RangeError("Unknown fault scenario")
            }

            faultScenarioId = scenarioId
            faultScenarioListeners.forEach((listener) =>
                listener(faultScenarioId),
            )
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        subscribeFaultScenario: (listener) => {
            faultScenarioListeners.add(listener)
            return () => faultScenarioListeners.delete(listener)
        },
    }
}
