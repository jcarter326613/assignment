import type {
    FaultMode,
    SensorConfiguration,
} from "@sensor/shared/protocol/telemetry"

export interface SensorControlPlane {
    getConfiguration(): SensorConfiguration
    setFaultMode(faultMode: FaultMode): SensorConfiguration
    setReportingInterval(reportingIntervalMs: number): SensorConfiguration
    subscribe(
        listener: (configuration: SensorConfiguration) => void,
    ): () => void
}

const defaultConfiguration: SensorConfiguration = {
    reportingIntervalMs: 1_000,
    faultMode: "none",
}

export function createSensorControlPlane(): SensorControlPlane {
    let configuration = defaultConfiguration
    const listeners = new Set<(configuration: SensorConfiguration) => void>()

    return {
        getConfiguration: () => configuration,
        setFaultMode: (faultMode) => {
            configuration = { ...configuration, faultMode }
            listeners.forEach((listener) => listener(configuration))
            return configuration
        },
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
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}
