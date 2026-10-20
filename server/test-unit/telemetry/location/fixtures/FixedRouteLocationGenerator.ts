import type { Location } from "@sensor/shared"
import type { LocationGenerator } from "../../../../src/telemetry/location/LocationGenerator"

export class FixedRouteLocationGenerator implements LocationGenerator {
    private currentIndex = 0
    powerDownCalls = 0

    constructor(private readonly route: readonly Location[]) {
        if (route.length === 0) {
            throw new RangeError(
                "A fixed route must contain at least one location",
            )
        }
    }

    next(timestampMs: number): Location {
        void timestampMs
        const location =
            this.route[Math.min(this.currentIndex, this.route.length - 1)]
        this.currentIndex += 1
        return { ...location }
    }

    powerDown() {
        this.powerDownCalls += 1
    }
}
