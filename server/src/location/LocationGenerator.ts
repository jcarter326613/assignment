import type { Location } from "@sensor/shared"

export type { Location } from "@sensor/shared"

export interface LocationGenerator {
    next(timestampMs: number): Location
    powerDown(): void
}
