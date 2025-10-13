<script lang="ts">
  import { onMount } from 'svelte';
  import * as L from 'leaflet';
  import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
  import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
  import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
  import {
    fetchWatershed,
    computeAreaSqMeters,
    type WatershedGeoJSON
  } from './lib/streamstatsClient';
  import {
    fetchRainfallCSV,
    parseRainfallCSV,
    type RainfallTable
  } from './lib/rainfall';
  import {
    computeRunoff,
    computeRunoffDepthCN,
    computeRunoffVolume,
    computeRationalPeak
  } from './lib/runoff';
  import { saveSwmmInp, type SwmmSubcatchment } from './lib/export';

  // References for DOM elements
  let mapDiv: HTMLDivElement;

  // Leaflet objects
  let map: L.Map;
  let marker: L.Marker | null = null;
  let watershedLayer: L.GeoJSON | null = null;

  // Input values
  let lat: number = 40.4406;
  let lon: number = -79.9959;
  let cn: number = 70;

  const COORD_DECIMALS = 6;
  const COORD_FACTOR = 10 ** COORD_DECIMALS;

  function roundCoord(value: number): number {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * COORD_FACTOR) / COORD_FACTOR;
  }

  // State variables
  let delineated: boolean = false;
  let watershed: WatershedGeoJSON | null = null;
  let areaAc: number = 0;
  let rainfallTable: RainfallTable | null = null;
  let durations: string[] = [];
  let aris: string[] = [];
  let selectedDuration: string = '';
  let selectedAri: string = '';
  let rainfallDepth: number = 0;
  let rainfallIntensity: number | null = null;
  let runoffDepth: number = 0;
  let runoffVolume: number = 0;
  let runoffCoeff: number = 0;
  let peakFlow: number = 0;
  let error: string = '';

  /** Convert a duration label (e.g., "1 hr", "15 min", "2 day") into hours. */
  function durationToHours(label: string): number {
    const m = label.toLowerCase().match(/(\d+(?:\.\d+)?)[^\d]*(min|minute|minutes|hr|hour|hours|day|days)/);
    if (!m) return 0;
    const value = parseFloat(m[1]);
    const unit = m[2];
    if (unit.startsWith('min')) return value / 60;
    if (unit.startsWith('hr')) return value;
    if (unit.startsWith('day')) return value * 24;
    return value;
  }

  async function delineate() {
    error = '';
    delineated = false;
    rainfallTable = null;
    rainfallDepth = 0;
    rainfallIntensity = null;
    selectedDuration = '';
    selectedAri = '';
    runoffDepth = runoffVolume = runoffCoeff = peakFlow = 0;
    try {
      // Corrected: Pass lat and lon inside an object
      watershed = await fetchWatershed({ lat, lon });

      const areaM2 = computeAreaSqMeters(watershed);
      areaAc = areaM2 * 0.000247105;
      delineated = true;
      // Clear existing layer and add the new boundary
      if (watershedLayer) {
        watershedLayer.remove();
        watershedLayer = null;
      }
      watershedLayer = L.geoJSON(watershed as any, {
        style: {
          color: '#33a02c',
          weight: 2,
          fillColor: '#b2df8a',
          fillOpacity: 0.3
        }
      }).addTo(map);
      // Fit bounds to the new watershed if possible
      try {
        const bounds = watershedLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.1));
        }
      } catch {}
    } catch (ex) {
      error = (ex as Error).message;
      console.error(ex);
    }
  }

  async function fetchRainfall() {
    error = '';
    rainfallTable = null;
    rainfallDepth = 0;
    rainfallIntensity = null;
    selectedDuration = '';
    selectedAri = '';
    runoffDepth = runoffVolume = runoffCoeff = peakFlow = 0;
    try {
      const csv = await fetchRainfallCSV(lat, lon);
      const table = parseRainfallCSV(csv);
      if (!table) {
        error = 'Failed to parse rainfall table.';
        return;
      }
      rainfallTable = table;
      durations = table.rows.map((r) => r.label);
      aris = table.aris;
      selectedDuration = durations[0];
      selectedAri = aris[0];
      computeDepthAndIntensity();
    } catch (ex) {
      error = (ex as Error).message;
    }
  }

  function computeDepthAndIntensity() {
    if (!rainfallTable) return;
    const row = rainfallTable.rows.find((r) => r.label === selectedDuration);
    if (!row) return;
    const val = row.values[selectedAri];
    rainfallDepth = Number.isFinite(val) ? val : 0;
    const hours = durationToHours(selectedDuration);
    rainfallIntensity = hours > 0 ? rainfallDepth / hours : null;
    // Reset downstream calculations
    runoffDepth = runoffVolume = runoffCoeff = peakFlow = 0;
  }

  function computeRunoffValues() {
    if (!rainfallDepth || !areaAc) return;
    // Compute runoff depth using CN
    runoffDepth = computeRunoffDepthCN(rainfallDepth, cn);
    runoffVolume = computeRunoffVolume(areaAc, runoffDepth);
    runoffCoeff = rainfallDepth > 0 ? runoffDepth / rainfallDepth : 0;
    // Compute peak discharge if intensity is available
    if (rainfallIntensity != null) {
      peakFlow = computeRationalPeak(rainfallIntensity, runoffCoeff, areaAc);
    } else {
      peakFlow = 0;
    }
  }

  function exportSwmm() {
    // Derive some rough parameters.  Width is estimated as 4×area/√perimeter.
    const width = Math.sqrt(areaAc) * 100; // simple proxy for demonstration
    const slope = 0.02;
    // Approximate impervious percentage based on CN (very rough mapping)
    let pctImperv = (cn - 30) / 70 * 100;
    pctImperv = Math.min(99, Math.max(0, pctImperv));
    const sub: SwmmSubcatchment = {
      name: 'S1',
      areaAc,
      pctImperv,
      width,
      slope,
      outlet: 'Out1'
    };
    saveSwmmInp(sub, 'watershed.inp');
  }

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

  // Initialise Leaflet map when component mounts
  onMount(() => {
    map = L.map(mapDiv).setView([lat, lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([lat, lon], { draggable: true, icon: defaultMarkerIcon }).addTo(map);
    marker.on('dragend', () => {
      const ll = marker!.getLatLng();
      lat = roundCoord(ll.lat);
      lon = roundCoord(ll.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      lat = roundCoord(e.latlng.lat);
      lon = roundCoord(e.latlng.lng);
      if (marker) {
        marker.setLatLng([lat, lon]);
      }
    });
  });

  $: if (Number.isFinite(lat)) {
    const roundedLat = roundCoord(lat);
    if (roundedLat !== lat) {
      lat = roundedLat;
    }
  }

  $: if (Number.isFinite(lon)) {
    const roundedLon = roundCoord(lon);
    if (roundedLon !== lon) {
      lon = roundedLon;
    }
  }
</script>

<div class="app">
  <header class="hero">
    <h1>Watershed Response Explorer</h1>
    <p>
      Pick a location, delineate its watershed, and evaluate rainfall-driven runoff in just a few
      taps. Follow the guided steps below for the best experience on any device.
    </p>
  </header>

  <div class="content">
    <aside class="sidebar" aria-label="Workflow instructions">
      <section class="card">
        <h2>How to get started</h2>
        <ol>
          <li><strong>Pan or tap</strong> on the map to drop the location marker.</li>
          <li>
            Enter precise latitude and longitude if you need accuracy, then choose
            <em>Delineate</em>.
          </li>
          <li>
            After the boundary appears, fetch design storm depths and select the duration/ARI pair
            that matches your scenario.
          </li>
          <li>
            Adjust the curve number (CN) and compute runoff to review depths, volumes, and peak
            discharge.
          </li>
          <li>
            Export to SWMM to continue hydraulic modelling in your preferred workflow.
          </li>
        </ol>
      </section>
      <section class="card tips">
        <h3>UX tips</h3>
        <ul>
          <li>Use two fingers to zoom the map on mobile.</li>
          <li>The marker is draggable—press and hold before moving it.</li>
          <li>
            Rainfall tables occasionally take a few seconds to download. Stay on the screen until
            options appear.
          </li>
          <li>Calculated results update each time you change rainfall or CN inputs.</li>
        </ul>
      </section>
    </aside>

    <main class="workflow" aria-label="Watershed configuration">
      <section class="card">
        <h2>Location</h2>
        <p class="helper-text">Tap the map or type coordinates below.</p>
        <div class="row">
          <label>
            Latitude
            <input type="number" bind:value={lat} step="0.0001" />
          </label>
          <label>
            Longitude
            <input type="number" bind:value={lon} step="0.0001" />
          </label>
        </div>
        <button class="primary" on:click={delineate}>Delineate watershed</button>
        {#if delineated}
          <p class="status">Boundary ready: {areaAc.toFixed(2)} acres</p>
        {/if}
      </section>

      {#if delineated}
        <section class="card">
          <h2>Rainfall</h2>
          <p class="helper-text">Fetch NOAA Atlas 14 data near your location.</p>
          <button class="secondary" on:click={fetchRainfall}>Fetch rainfall table</button>
          {#if rainfallTable}
            <div class="row">
              <label>
                Duration
                <select bind:value={selectedDuration} on:change={computeDepthAndIntensity}>
                  {#each durations as d}
                    <option value={d}>{d}</option>
                  {/each}
                </select>
              </label>
              <label>
                ARI (years)
                <select bind:value={selectedAri} on:change={computeDepthAndIntensity}>
                  {#each aris as a}
                    <option value={a}>{a}</option>
                  {/each}
                </select>
              </label>
            </div>
            <button class="secondary" on:click={computeDepthAndIntensity}>Update rainfall</button>
          {/if}
          {#if rainfallDepth > 0}
            <div class="summary">
              <span>Depth: {rainfallDepth.toFixed(2)} in</span>
              {#if rainfallIntensity != null}
                <span>Intensity: {rainfallIntensity.toFixed(2)} in/hr</span>
              {/if}
            </div>
          {/if}
        </section>
      {/if}

      {#if rainfallDepth > 0}
        <section class="card">
          <h2>Runoff</h2>
          <p class="helper-text">Curve Number defaults to mixed suburban land use.</p>
          <div class="row">
            <label>
              Curve Number (30–100)
              <input type="number" min="30" max="100" bind:value={cn} step="1" />
            </label>
          </div>
          <button class="primary" on:click={computeRunoffValues}>Compute runoff</button>
          {#if runoffDepth > 0}
            <div class="summary">
              <span>Runoff depth: {runoffDepth.toFixed(2)} in</span>
              <span>Volume: {runoffVolume.toFixed(2)} acre‑ft</span>
              <span>Coeff: {runoffCoeff.toFixed(2)}</span>
              {#if peakFlow > 0}
                <span>Peak flow: {peakFlow.toFixed(2)} cfs</span>
              {/if}
            </div>
            <button class="secondary" on:click={exportSwmm}>Export SWMM file</button>
          {/if}
        </section>
      {/if}

      {#if error}
        <section class="card error-card" role="alert">
          <h2>Heads up</h2>
          <p>{error}</p>
        </section>
      {/if}
    </main>

    <section class="map-panel" aria-label="Interactive map">
      <div id="map" bind:this={mapDiv} role="application" aria-describedby="map-help"></div>
      <p id="map-help" class="map-help">
        Tap anywhere to move the marker, or drag the pin for fine adjustments. Map tiles courtesy of
        OpenStreetMap.
      </p>
    </section>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f3f4f6;
    color: #1f2933;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .hero {
    padding: 1.5rem clamp(1rem, 3vw, 2.5rem);
    background: linear-gradient(135deg, #0b7285, #31a69d);
    color: white;
    text-align: left;
  }

  .hero h1 {
    margin: 0 0 0.5rem;
    font-size: clamp(1.5rem, 5vw, 2.4rem);
  }

  .hero p {
    margin: 0;
    max-width: 48rem;
    line-height: 1.5;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: clamp(1rem, 3vw, 2.5rem);
    flex: 1;
  }

  .sidebar,
  .workflow,
  .map-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card {
    background: white;
    padding: 1rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px -20px rgba(15, 23, 42, 0.35);
  }

  .card h2,
  .card h3 {
    margin-top: 0;
    margin-bottom: 0.75rem;
  }

  .card p {
    margin-top: 0;
  }

  .card ol,
  .card ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .card li + li {
    margin-top: 0.5rem;
  }

  .tips ul {
    list-style: disc;
  }

  .workflow .row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.95rem;
    font-weight: 500;
  }

  input[type='number'],
  select {
    padding: 0.55rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #cbd5e1;
    font-size: 1rem;
    background: #fff;
    color: inherit;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  button:focus-visible {
    outline: 3px solid #0ea5e9;
    outline-offset: 2px;
  }

  button.primary {
    background: #0f766e;
    color: white;
    box-shadow: 0 10px 20px -10px rgba(15, 118, 110, 0.6);
  }

  button.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -12px rgba(15, 118, 110, 0.55);
  }

  button.secondary {
    background: #e2e8f0;
    color: #0f172a;
  }

  button.secondary:hover {
    transform: translateY(-1px);
  }

  .helper-text {
    color: #52606d;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .status {
    margin-top: 0.75rem;
    font-weight: 600;
    color: #0f766e;
  }

  .summary {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
    color: #0f172a;
  }

  .error-card {
    border-left: 4px solid #f97316;
  }

  .error-card h2 {
    color: #d9480f;
  }

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
    .content {
      flex-direction: row;
      align-items: flex-start;
    }

    .sidebar {
      flex: 0 0 320px;
    }

    .workflow {
      flex: 0 0 340px;
    }

    .map-panel {
      flex: 1;
      min-height: 520px;
    }

    .workflow .row {
      flex-direction: row;
      justify-content: space-between;
    }

    .workflow .row label {
      flex: 1;
    }

    .workflow .row label + label {
      margin-left: 1rem;
    }

    .summary {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
  }
</style>
