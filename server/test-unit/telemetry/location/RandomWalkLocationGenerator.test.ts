import { describe, expect, test } from "vitest"
import { calculateGreatCircleDistanceMeters } from "@sensor/shared"
import {
    CLEVELAND_CITY_CENTER,
    RandomWalkLocationGenerator,
} from "../../../src/telemetry/location/RandomWalkLocationGenerator"

describe("RandomWalkLocationGenerator", () => {
    test("starts at Cleveland city center with centimetre altitude precision", () => {
        const generator = new RandomWalkLocationGenerator(() => 0)

        expect(generator.next(0)).toEqual(CLEVELAND_CITY_CENTER)
    })

    test("moves at the configured random driving speed and direction", () => {
        const generator = new RandomWalkLocationGenerator(() => 0)
        const start = generator.next(0)
        const afterOneSecond = generator.next(1_000)

        expect(
            calculateGreatCircleDistanceMeters(start, afterOneSecond),
        ).toBeCloseTo(8.9408, 2)
        expect(afterOneSecond.longitude).toBe(start.longitude)
        expect(afterOneSecond.latitude).toBeGreaterThan(start.latitude)
    })

    test("selects a new leg after the previous leg expires", () => {
        const randomValues = [0, 0, 0, 0.25, 0, 0]
        let index = 0
        const generator = new RandomWalkLocationGenerator(
            () => randomValues[index++],
        )
        const start = generator.next(0)
        const afterFirstLeg = generator.next(3_000)
        const afterSecondLegSecond = generator.next(4_000)

        expect(afterFirstLeg.latitude).toBeGreaterThan(start.latitude)
        expect(afterSecondLegSecond.longitude).toBeGreaterThan(
            afterFirstLeg.longitude,
        )
    })

    test("pauses elapsed simulation time while powered down", () => {
        const generator = new RandomWalkLocationGenerator(() => 0)
        generator.next(0)
        const beforePowerDown = generator.next(1_000)

        generator.powerDown()

        expect(generator.next(60_000)).toEqual(beforePowerDown)
    })
})
