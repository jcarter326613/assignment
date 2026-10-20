import { describe, expect, test } from "vitest"
import { FixedRouteLocationGenerator } from "./FixedRouteLocationGenerator"

describe("FixedRouteLocationGenerator", () => {
    test("returns its locations in order and remains at the final location", () => {
        const firstLocation = {
            longitude: -81.69436,
            latitude: 41.49932,
            altitude: 199,
            horizontalAccuracyMeters: 0.05,
        }
        const finalLocation = {
            longitude: -81.69435,
            latitude: 41.49933,
            altitude: 199,
            horizontalAccuracyMeters: 0.05,
        }
        const generator = new FixedRouteLocationGenerator([
            firstLocation,
            finalLocation,
        ])

        expect(generator.next(0)).toEqual(firstLocation)
        generator.powerDown()
        expect(generator.next(1_000)).toEqual(finalLocation)
        expect(generator.next(2_000)).toEqual(finalLocation)
    })

    test("requires at least one location", () => {
        expect(() => new FixedRouteLocationGenerator([])).toThrow(
            "at least one location",
        )
    })
})
