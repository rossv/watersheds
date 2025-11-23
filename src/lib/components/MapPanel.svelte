<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as L from 'leaflet';
  import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
  import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
  import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
  import type { WatershedGeoJSON } from '../services/delineation';

  export let lat: number;
  export let lon: number;
  export let watershed: WatershedGeoJSON | null;
  export let delineated: boolean;
  export let onLocationChange: (lat: number, lon: number) => void;

  let mapDiv: HTMLDivElement;
  let map: L.Map;
  let marker: L.Marker | null = null;
  let watershedLayer: L.GeoJSON | null = null;

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
    shadowSize: [41, 41]
  });

  function roundCoord(value: number): number {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * COORD_FACTOR) / COORD_FACTOR;
  }

  function initializeMap() {
    map = L.map(mapDiv).setView([lat, lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([lat, lon], { draggable: true, icon: defaultMarkerIcon }).addTo(map);
    marker.on('dragend', () => {
      const ll = marker!.getLatLng();
      onLocationChange(roundCoord(ll.lat), roundCoord(ll.lng));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      onLocationChange(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
    });
  }

  function refreshWatershedLayer() {
    if (!map) return;
    if (watershedLayer) {
      watershedLayer.remove();
      watershedLayer = null;
    }
    if (!watershed) return;

    watershedLayer = L.geoJSON(watershed as any, {
      style: {
        color: '#33a02c',
        weight: 2,
        fillColor: '#b2df8a',
        fillOpacity: 0.3
      }
    }).addTo(map);

    try {
      const bounds = watershedLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
      }
    } catch (err) {
      console.warn('Failed to fit watershed bounds', err);
    }
  }

  $: if (map && marker && Number.isFinite(lat) && Number.isFinite(lon)) {
    const roundedLat = roundCoord(lat);
    const roundedLon = roundCoord(lon);
    marker.setLatLng([roundedLat, roundedLon]);
  }

  $: if (delineated) {
    refreshWatershedLayer();
  } else if (watershedLayer) {
    watershedLayer.remove();
    watershedLayer = null;
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
  <div id="map" bind:this={mapDiv} role="application" aria-describedby="map-help"></div>
  <p id="map-help" class="map-help">
    Tap anywhere to move the marker, or drag the pin for fine adjustments. Map tiles courtesy of
    OpenStreetMap.
  </p>
</section>

<style>
  .map-panel {
    flex: 1;
  }

  #map {
    flex: 1;
    min-height: 320px;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 18px 36px -24px rgba(15, 23, 42, 0.45);
  }

  .map-help {
    margin: 0.75rem 0 0;
    color: #52606d;
    font-size: 0.9rem;
  }

  @media (min-width: 960px) {
    #map {
      min-height: 520px;
    }
  }
</style>
