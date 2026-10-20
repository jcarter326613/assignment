import type { FaultScenario } from "@sensor/shared/protocol/administration"

export const faultScenarios: readonly FaultScenario[] = [
    {
        id: "temporary-location-jump",
        label: "Simulate temporary location jump",
    },
    {
        id: "persistent-teleportation",
        label: "Simulate persistent teleportation",
    },
    { id: "hardware-error", label: "Simulate hardware error" },
    { id: "poor-location-accuracy", label: "Simulate poor location accuracy" },
]

export function isFaultScenarioId(value: string) {
    return faultScenarios.some((scenario) => scenario.id === value)
}
