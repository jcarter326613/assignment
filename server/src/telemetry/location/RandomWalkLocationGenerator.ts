import type { Location } from "@sensor/shared"
import type { LocationGenerator } from "./LocationGenerator"

const EARTH_RADIUS_METERS = 6_378_137
const METERS_PER_MILE = 1_609.344
const SECONDS_PER_HOUR = 3_600
const MIN_SPEED_MPH = 20
const SPEED_RANGE_MPH = 30
const MIN_LEG_DURATION_MS = 3_000
const LEG_DURATION_RANGE_MS = 7_000
const COORDINATE_PRECISION = 10_000_000
const ALTITUDE_PRECISION = 100

export const CLEVELAND_CITY_CENTER: Location = {
    longitude: -81.69436,
    latitude: 41.49932,
    altitude: 199,
    horizontalAccuracyMeters: 0.05,
}

function round(value: number, precision: number) {
    return Math.round(value * precision) / precision
}

export class RandomWalkLocationGenerator implements LocationGenerator {
    private latitudeRadians = this.toRadians(CLEVELAND_CITY_CENTER.latitude)
    private longitudeRadians = this.toRadians(CLEVELAND_CITY_CENTER.longitude)
    private lastTimestampMs: number | undefined
    private bearingRadians = 0
    private speedMetersPerSecond = 0
    private remainingLegDurationMs = 0
    private isPoweredDown = false

    constructor(private readonly random = Math.random) {}

    next(timestampMs: number): Location {
        if (!Number.isFinite(timestampMs)) {
            throw new RangeError("timestampMs must be a finite number")
        }

        if (this.lastTimestampMs === undefined || this.isPoweredDown) {
            this.lastTimestampMs = timestampMs
            this.isPoweredDown = false

            if (this.remainingLegDurationMs === 0) {
                this.beginLeg()
            }

            return this.currentLocation()
        }

        if (timestampMs < this.lastTimestampMs) {
            throw new RangeError("timestampMs cannot move backwards")
        }

        let remainingElapsedMs = timestampMs - this.lastTimestampMs

        while (remainingElapsedMs > 0) {
            if (this.remainingLegDurationMs === 0) {
                this.beginLeg()
            }

            const movementDurationMs = Math.min(
                remainingElapsedMs,
                this.remainingLegDurationMs,
            )
            this.move(movementDurationMs)
            remainingElapsedMs -= movementDurationMs
            this.remainingLegDurationMs -= movementDurationMs
        }

        this.lastTimestampMs = timestampMs
        return this.currentLocation()
    }

    powerDown() {
        this.isPoweredDown = true
    }

    private beginLeg() {
        this.bearingRadians = this.randomInRange(0, 2 * Math.PI)
        this.speedMetersPerSecond =
            this.randomInRange(MIN_SPEED_MPH, MIN_SPEED_MPH + SPEED_RANGE_MPH) *
            (METERS_PER_MILE / SECONDS_PER_HOUR)
        this.remainingLegDurationMs = this.randomInRange(
            MIN_LEG_DURATION_MS,
            MIN_LEG_DURATION_MS + LEG_DURATION_RANGE_MS,
        )
    }

    private currentLocation(): Location {
        return {
            longitude: round(
                this.toDegrees(this.longitudeRadians),
                COORDINATE_PRECISION,
            ),
            latitude: round(
                this.toDegrees(this.latitudeRadians),
                COORDINATE_PRECISION,
            ),
            altitude: round(CLEVELAND_CITY_CENTER.altitude, ALTITUDE_PRECISION),
            horizontalAccuracyMeters:
                CLEVELAND_CITY_CENTER.horizontalAccuracyMeters,
        }
    }

    private move(durationMs: number) {
        const distanceMeters = this.speedMetersPerSecond * (durationMs / 1_000)
        const northMeters = distanceMeters * Math.cos(this.bearingRadians)
        const eastMeters = distanceMeters * Math.sin(this.bearingRadians)

        this.latitudeRadians += northMeters / EARTH_RADIUS_METERS
        this.longitudeRadians +=
            eastMeters / (EARTH_RADIUS_METERS * Math.cos(this.latitudeRadians))
    }

    private randomInRange(minimum: number, maximum: number) {
        const value = this.random()

        if (value < 0 || value >= 1) {
            throw new RangeError(
                "random values must be at least 0 and less than 1",
            )
        }

        return minimum + value * (maximum - minimum)
    }

    private toDegrees(radians: number) {
        return radians * (180 / Math.PI)
    }

    private toRadians(degrees: number) {
        return degrees * (Math.PI / 180)
    }
}
