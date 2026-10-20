const defaultTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const defaultAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export const mapTileUrl = import.meta.env.VITE_MAP_TILE_URL ?? defaultTileUrl
export const mapAttribution =
    import.meta.env.VITE_MAP_ATTRIBUTION ?? defaultAttribution
export const defaultMapCenter: [number, number] = [41.49932, -81.69436]
export const defaultMapZoom = 16
