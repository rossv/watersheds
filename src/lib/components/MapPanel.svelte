<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
  import markerIconUrl from "leaflet/dist/images/marker-icon.png";
  import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
  import type { WatershedGeoJSON } from "../services/delineation";

  export let lat: number;
  export let lon: number;
  export let watershed: WatershedGeoJSON | null;
  export let delineated: boolean;
  export let onLocationChange: (lat: number, lon: number) => void;

  let mapDiv: HTMLDivElement;
  let map: L.Map;
  let marker: L.Marker | null = null;
  let watershedLayer: L.GeoJSON | null = null;

  // WMS Layers
  let nlcdLayer: L.TileLayer.WMS | null = null;
  let soilLayer: L.TileLayer.WMS | null = null;
  let hydroLayer: L.TileLayer.WMS | null = null;

  let activeLayer: "none" | "nlcd" | "soil" = "nlcd";
  let showStreams = false;

  const COORD_DECIMALS = 6;
  const COORD_FACTOR = 10 ** COORD_DECIMALS;

  const defaultMarkerIcon = L.icon({
    iconRetinaUrl: markerIcon2xUrl,
    iconUrl: markerIconUrl,
    shadowUrl: markerShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });

  function roundCoord(value: number): number {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * COORD_FACTOR) / COORD_FACTOR;
  }

  function initializeMap() {
    if (map) return;
    if (!mapDiv) return;

    map = L.map(mapDiv).setView([lat, lon], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    marker = L.marker([lat, lon], {
      draggable: true,
      icon: defaultMarkerIcon,
    }).addTo(map);
    marker.on("dragend", () => {
      const ll = marker!.getLatLng();
      onLocationChange(roundCoord(ll.lat), roundCoord(ll.lng));
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      onLocationChange(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
    });
  }

  function updateWmsLayers() {
    if (!map) return;

    // Remove all WMS layers first
    if (nlcdLayer) {
      nlcdLayer.remove();
      nlcdLayer = null;
    }
    if (soilLayer) {
      soilLayer.remove();
      soilLayer = null;
    }
    // Hydro layer is handled separately now, but we clean it up here to be safe if we need a full reset
    // Actually, let's keep the logic clean: this function updates ALL WMS layers based on state.
    if (hydroLayer) {
      hydroLayer.remove();
      hydroLayer = null;
    }

    // 1. Base Overlays (Mutually Exclusive) - Only if delineated (or if we want to allow them earlier, but user asked for streams)
    if (watershed && activeLayer === "nlcd") {
      nlcdLayer = L.tileLayer
        .wms("https://www.mrlc.gov/geoserver/wms", {
          layers: "mrlc_display:NLCD_2021_Land_Cover_L48",
          format: "image/png",
          transparent: true,
          opacity: 0.6,
          attribution: "MRLC NLCD 2021",
        })
        .addTo(map);
    } else if (watershed && activeLayer === "soil") {
      soilLayer = L.tileLayer
        .wms("https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms", {
          layers: "MapunitPoly",
          format: "image/png",
          transparent: true,
          opacity: 0.6,
          attribution: "USDA Web Soil Survey",
        })
        .addTo(map);
    }

    // 2. Streams Overlay (Independent)
    if (showStreams) {
      hydroLayer = L.tileLayer
        .wms(
          "https://hydro.nationalmap.gov/arcgis/services/nhd/MapServer/WMSServer",
          {
            layers: "6,8", // Layer 6 (Large Scale) and 8 (Small Scale) for flowlines
            format: "image/png",
            transparent: true,
            opacity: 0.8, // Increased opacity for visibility
            attribution: "USGS NHD",
            zIndex: 10, // Ensure it's on top
          },
        )
        .addTo(map);
    }
  }

  function refreshWatershedLayer() {
    if (!map) return;

    if (watershedLayer) {
      watershedLayer.remove();
      watershedLayer = null;
    }

    if (!watershed) return;

    // Add Watershed Layer
    watershedLayer = L.geoJSON(watershed as any, {
      style: {
        color: "#33a02c",
        weight: 2,
        fillColor: "#b2df8a",
        fillOpacity: 0.3,
      },
    }).addTo(map);

    try {
      const bounds = watershedLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
      }
    } catch (err) {
      console.warn("Failed to fit watershed bounds", err);
    }

    updateWmsLayers();
  }

  $: if (map && marker && Number.isFinite(lat) && Number.isFinite(lon)) {
    const roundedLat = roundCoord(lat);
    const roundedLon = roundCoord(lon);
    marker.setLatLng([roundedLat, roundedLon]);
  }

  $: if (delineated) {
    refreshWatershedLayer();
  } else {
    if (watershedLayer) {
      watershedLayer.remove();
      watershedLayer = null;
    }
    updateWmsLayers();
  }

  // React to activeLayer change
  $: if (map && (activeLayer || showStreams !== undefined)) {
    updateWmsLayers();
  }

  onMount(() => {
    initializeMap();
    return () => {
      map?.remove();
    };
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<section class="map-panel" aria-label="Interactive map">
  <div class="map-container">
    <div
      id="map"
      bind:this={mapDiv}
      role="application"
      aria-describedby="map-help"
    ></div>

    <div class="layer-control">
      <label class="streams-toggle">
        <input type="checkbox" bind:checked={showStreams} />
        <span style="font-weight: 600; color: #0066cc;">Show Streams</span>
      </label>

      {#if delineated}
        <div class="divider"></div>
        <label>
          <input type="radio" bind:group={activeLayer} value="none" /> None
        </label>
        <label>
          <input type="radio" bind:group={activeLayer} value="nlcd" /> Land Cover
        </label>
        <label>
          <input type="radio" bind:group={activeLayer} value="soil" /> Soil
        </label>
      {/if}
    </div>
  </div>

  <p id="map-help" class="map-help">
    Tap anywhere to move the marker, or drag the pin for fine adjustments. Map
    tiles courtesy of OpenStreetMap.
  </p>
</section>

<style>
  .map-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .map-container {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 320px;
  }

  #map {
    flex: 1;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 18px 36px -24px rgba(15, 23, 42, 0.45);
    z-index: 1;
  }

  .layer-control {
    position: absolute;
    top: 10px;
    right: 10px;
    background: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 1000; /* Above map */
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: #333; /* Ensure text is dark on white background */
  }

  .layer-control label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .map-help {
    margin: 0.75rem 0 0;
    color: #52606d;
    font-size: 0.9rem;
  }

  @media (min-width: 960px) {
    .map-container {
      min-height: 520px;
    }
  }

  .divider {
    height: 1px;
    background: #e2e8f0;
    margin: 0.25rem 0;
  }
</style>
