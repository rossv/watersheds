import type { FeatureCollection, Geometry, Position } from 'geojson';
import type { LandUseItem } from '../store';
import { TR55_CATEGORIES } from '../cnTable';
import { fetchWithProxy } from '../http';

const NLCD_WMS_URL = 'https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms';

// NLCD Class to TR-55 Category ID mapping
const NLCD_MAPPING: Record<number, string> = {
    21: 'open_space_good',    // Developed, Open Space
    22: 'residential_1_2',    // Developed, Low Intensity
    23: 'residential_1_8',    // Developed, Medium Intensity
    24: 'impervious',         // Developed, High Intensity
    41: 'woods_good',         // Deciduous Forest
    42: 'woods_good',         // Evergreen Forest
    43: 'woods_good',         // Mixed Forest
    52: 'woods_poor',         // Shrub/Scrub
    71: 'pasture_good',       // Grassland/Herbaceous
    81: 'pasture_good',       // Pasture/Hay
    82: 'meadow',             // Cultivated Crops
    90: 'woods_fair',         // Woody Wetlands
    95: 'meadow',             // Emergent Herbaceous Wetlands
};

export async function fetchLandUse(watershed: FeatureCollection<Geometry>): Promise<LandUseItem[]> {
    const points = generateSamplePoints(watershed, 20); // 20 samples
    if (points.length === 0) return [];

    const counts: Record<string, number> = {};
    let validSamples = 0;

    // Fetch in batches to avoid browser connection limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);
        const promises = batch.map(pt => fetchNlcdClass(pt));
        const results = await Promise.all(promises);

        for (const nlcdClass of results) {
            if (nlcdClass !== null && NLCD_MAPPING[nlcdClass]) {
                const catId = NLCD_MAPPING[nlcdClass];
                counts[catId] = (counts[catId] || 0) + 1;
                validSamples++;
            }
        }
    }

    if (validSamples === 0) return [];

    const items: LandUseItem[] = Object.entries(counts).map(([catId, count]) => ({
        id: crypto.randomUUID(),
        categoryId: catId,
        hsg: 'C', // Default to C
        percentage: Math.round((count / validSamples) * 100)
    }));

    // Normalize to ensure sum is 100%
    const total = items.reduce((sum, i) => sum + i.percentage, 0);
    if (total !== 100 && items.length > 0) {
        const diff = 100 - total;
        items[0].percentage += diff;
    }

    return items;
}

async function fetchNlcdClass(point: Position): Promise<number | null> {
    const [lon, lat] = point;
    // Small bbox around the point
    const buffer = 0.0001;
    const bbox = `${lon - buffer},${lat - buffer},${lon + buffer},${lat + buffer}`;

    const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        QUERY_LAYERS: 'NLCD_2021_Land_Cover_L48',
        LAYERS: 'NLCD_2021_Land_Cover_L48',
        INFO_FORMAT: 'application/json',
        SRS: 'EPSG:4326',
        BBOX: bbox,
        WIDTH: '2',
        HEIGHT: '2',
        X: '1',
        Y: '1'
    });

    try {
        const url = `${NLCD_WMS_URL}?${params.toString()}`;
        console.log('Fetching NLCD:', url);
        const res = await fetchWithProxy({
            url,
            devProxyUrl: `/mrlc-api/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms?${params.toString()}`
        });

        if (!res.ok) {
            console.warn('NLCD fetch failed:', res.status, res.statusText);
            return null;
        }

        let data: any;
        const text = await res.text();
        console.log('NLCD response:', text.substring(0, 100));
        try {
            data = JSON.parse(text);
            if (data.contents && typeof data.contents === 'string') {
                data = JSON.parse(data.contents);
            }
        } catch (e) {
            console.warn('Failed to parse NLCD JSON:', e);
            return null;
        }

        if (data.features && data.features.length > 0) {
            console.log('Found feature:', data.features[0].properties.PALETTE_INDEX);
            return data.features[0].properties.PALETTE_INDEX;
        } else {
            console.log('No features found');
        }
    } catch (e) {
        console.warn('Failed to fetch NLCD data', e);
    }
    return null;
}

function generateSamplePoints(fc: FeatureCollection<Geometry>, count: number): Position[] {
    const bbox = getBBox(fc);
    const [minX, minY, maxX, maxY] = bbox;
    const points: Position[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = count * 10;

    while (points.length < count && attempts < MAX_ATTEMPTS) {
        const lon = minX + Math.random() * (maxX - minX);
        const lat = minY + Math.random() * (maxY - minY);
        if (isPointInFeatureCollection([lon, lat], fc)) {
            points.push([lon, lat]);
        }
        attempts++;
    }
    return points;
}

function getBBox(fc: FeatureCollection<Geometry>): [number, number, number, number] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Helper to process coordinates
    const processCoords = (coords: Position[]) => {
        for (const [x, y] of coords) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    };

    for (const feature of fc.features) {
        if (!feature.geometry) continue;
        const geom = feature.geometry;
        if (geom.type === 'Polygon') {
            processCoords(geom.coordinates[0]);
        } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) {
                processCoords(poly[0]);
            }
        }
    }
    return [minX, minY, maxX, maxY];
}

function isPointInFeatureCollection(pt: Position, fc: FeatureCollection<Geometry>): boolean {
    for (const feature of fc.features) {
        if (!feature.geometry) continue;
        if (isPointInGeometry(pt, feature.geometry)) return true;
    }
    return false;
}

function isPointInGeometry(pt: Position, geom: Geometry): boolean {
    if (geom.type === 'Polygon') {
        return pointInPolygon(pt, geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
        return geom.coordinates.some(poly => pointInPolygon(pt, poly));
    }
    return false;
}

function pointInPolygon(pt: Position, rings: Position[][]): boolean {
    const [x, y] = pt;
    let inside = false;
    // Check outer ring only for simplicity, or handle holes if needed.
    // Usually checking outer ring is enough for positive inclusion, 
    // but strictly should check holes. For sampling, outer ring is mostly fine.
    // Let's just check the first ring (outer).
    const ring = rings[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
