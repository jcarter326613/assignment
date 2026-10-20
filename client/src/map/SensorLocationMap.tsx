import { useEffect, useRef, useState } from "react"
import type { Location } from "@sensor/shared"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import {
    defaultMapCenter,
    defaultMapZoom,
    mapAttribution,
    mapTileUrl,
} from "./mapConfig"
import { SensorLocationLayer } from "./SensorLocationLayer"
import "leaflet/dist/leaflet.css"
import "./map.css"

type SensorLocationMapProps = {
    location: Location | undefined
    mode?: "live" | "playback"
}

type LocationFollowerProps = {
    following: boolean
    location: Location | undefined
    onUserMove: () => void
}

function LocationFollower({
    following,
    location,
    onUserMove,
}: LocationFollowerProps) {
    const hasFollowedLocation = useRef(false)
    const map = useMapEvents({
        dragstart: onUserMove,
        zoomstart: onUserMove,
    })

    useEffect(() => {
        if (!following || location === undefined) {
            return
        }

        map.panTo([location.latitude, location.longitude], {
            animate: hasFollowedLocation.current,
        })
        hasFollowedLocation.current = true
    }, [following, location, map])

    return null
}

export function SensorLocationMap({
    location,
    mode = "live",
}: SensorLocationMapProps) {
    const [following, setFollowing] = useState(true)

    useEffect(() => setFollowing(true), [mode])

    return (
        <section
            aria-label={
                mode === "playback" ? "Recorded sensor map" : "Live sensor map"
            }
            className="sensor-map-panel"
        >
            <h2>
                {mode === "playback" ? "Recorded location" : "Live location"}
            </h2>
            <div className="sensor-map-shell">
                <MapContainer
                    center={defaultMapCenter}
                    className="sensor-map"
                    scrollWheelZoom
                    zoom={defaultMapZoom}
                >
                    <TileLayer attribution={mapAttribution} url={mapTileUrl} />
                    <SensorLocationLayer location={location} />
                    <LocationFollower
                        following={following}
                        location={location}
                        onUserMove={() => setFollowing(false)}
                    />
                </MapContainer>
                {!following && location !== undefined ? (
                    <button
                        className="resume-following-button"
                        onClick={() => setFollowing(true)}
                        type="button"
                    >
                        Resume following
                    </button>
                ) : null}
            </div>
        </section>
    )
}
