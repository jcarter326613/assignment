export interface Location {
    longitude: number
    latitude: number
    altitude: number
}

const EARTH_RADIUS_METERS = 6_378_137

function toRadians(degrees: number) {
    return degrees * (Math.PI / 180)
}

export function calculateGreatCircleDistanceMeters(
    first: Pick<Location, "latitude" | "longitude">,
    second: Pick<Location, "latitude" | "longitude">,
) {
    const latitudeDifference = toRadians(second.latitude - first.latitude)
    const longitudeDifference = toRadians(second.longitude - first.longitude)
    const firstLatitude = toRadians(first.latitude)
    const secondLatitude = toRadians(second.latitude)
    const chord =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitude) *
            Math.cos(secondLatitude) *
            Math.sin(longitudeDifference / 2) ** 2

    return (
        2 *
        EARTH_RADIUS_METERS *
        Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
    )
}
