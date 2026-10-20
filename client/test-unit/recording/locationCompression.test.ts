import { expect, test } from "vitest"
import { compressLocations } from "../../src/recording/locationCompression"

const location = (
    timestampMs: number,
    longitude: number,
    horizontalAccuracyMeters = 1,
) => ({
    timestampMs,
    latitude: 41,
    longitude,
    altitude: 200,
    horizontalAccuracyMeters,
})

test("compresses readings that follow one constant movement vector", () => {
    const recording = compressLocations([
        location(1_000, -81),
        location(2_000, -80.999),
        location(3_000, -80.998),
    ])

    expect(recording?.segments).toEqual([
        [
            2_000,
            [-810000000, 410000000, 20000, 1000],
            [-809980000, 410000000, 20000, 1000],
        ],
    ])
})

test("splits a segment when movement departs beyond reported accuracy", () => {
    const recording = compressLocations([
        location(1_000, -81),
        location(2_000, -80.999),
        location(3_000, -80.996),
    ])

    expect(recording?.segments).toEqual([
        [
            1_000,
            [-810000000, 410000000, 20000, 1000],
            [-809990000, 410000000, 20000, 1000],
        ],
        [
            1_000,
            [-809990000, 410000000, 20000, 1000],
            [-809960000, 410000000, 20000, 1000],
        ],
    ])
})

test("keeps deviations within the combined accuracy tolerance", () => {
    const recording = compressLocations([
        location(1_000, -81, 100),
        location(2_000, -80.999, 100),
        location(3_000, -80.996, 100),
    ])

    expect(recording?.segments).toHaveLength(1)
})

test("rejects locations that are not strictly time ordered", () => {
    expect(() =>
        compressLocations([location(1_000, -81), location(1_000, -80.999)]),
    ).toThrow(RangeError)
})
