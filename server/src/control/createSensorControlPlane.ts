import type {
    SensorConfiguration,
    SensorConfigurationUpdate,
} from "@sensor/shared"

export interface SensorControlPlane {
    getConfiguration(): SensorConfiguration
    updateConfiguration(update: SensorConfigurationUpdate): SensorConfiguration
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
        updateConfiguration: (update) => {
            const nextConfiguration = { ...configuration, ...update }

            if (
                !Number.isInteger(nextConfiguration.reportingIntervalMs) ||
                nextConfiguration.reportingIntervalMs < 100
            ) {
                throw new RangeError(
                    "reportingIntervalMs must be an integer of at least 100",
                )
            }

            configuration = nextConfiguration
            listeners.forEach((listener) => listener(configuration))
            return configuration
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}
