import type { Location } from "@sensor/shared"
import { Circle, CircleMarker } from "react-leaflet"

type SensorLocationLayerProps = {
    location: Location | undefined
}

export function SensorLocationLayer({ location }: SensorLocationLayerProps) {
    if (location === undefined) {
        return null
    }

    const position: [number, number] = [location.latitude, location.longitude]

    return (
        <>
            <Circle
                center={position}
                color="#0b5fff"
                fillColor="#0b5fff"
                fillOpacity={0.15}
                radius={location.horizontalAccuracyMeters}
                weight={2}
            />
            <CircleMarker
                center={position}
                color="#ffffff"
                fillColor="#0b5fff"
                fillOpacity={1}
                radius={7}
                weight={3}
            />
        </>
    )
}
