import { describe, expect, test } from "vitest"
import { calculateGreatCircleDistanceMeters } from "../src/coordinates"

describe("calculateGreatCircleDistanceMeters", () => {
    test("calculates the distance between two coordinates", () => {
        const distanceMeters = calculateGreatCircleDistanceMeters(
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 0 },
        )

        expect(distanceMeters).toBeCloseTo(111_319.49, 2)
    })

    test("returns zero for the same coordinate", () => {
        const location = { latitude: 41.49932, longitude: -81.69436 }

        expect(calculateGreatCircleDistanceMeters(location, location)).toBe(0)
    })
})
