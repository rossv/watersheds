<script lang="ts">
  import { onMount } from 'svelte';
  import * as L from 'leaflet';
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
    runoffDepth = runoffVolume = runoffCoeff = peakFlow = 0;
    try {
      watershed = await fetchWatershed(lat, lon);
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

  // Initialise Leaflet map when component mounts
  onMount(() => {
    map = L.map(mapDiv).setView([lat, lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const ll = marker!.getLatLng();
      lat = ll.lat;
      lon = ll.lng;
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      lat = e.latlng.lat;
      lon = e.latlng.lng;
      if (marker) {
        marker.setLatLng([lat, lon]);
      }
    });
  });
</script>

<div class="container">
  <div class="controls">
    <div class="row">
      <label>
        Latitude:
        <input type="number" bind:value={lat} step="0.0001" />
      </label>
      <label>
        Longitude:
        <input type="number" bind:value={lon} step="0.0001" />
      </label>
      <button on:click={delineate}>Delineate</button>
    </div>
    {#if delineated}
      <div class="row info">
        <span>Area: {areaAc.toFixed(2)} acres</span>
        <button on:click={fetchRainfall}>Fetch Rainfall</button>
      </div>
    {/if}
    {#if rainfallTable}
      <div class="row">
        <label>
          Duration:
          <select bind:value={selectedDuration} on:change={computeDepthAndIntensity}>
            {#each durations as d}
              <option value={d}>{d}</option>
            {/each}
          </select>
        </label>
        <label>
          ARI (years):
          <select bind:value={selectedAri} on:change={computeDepthAndIntensity}>
            {#each aris as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
        </label>
        <button on:click={computeDepthAndIntensity}>Select</button>
      </div>
    {/if}
    {#if rainfallDepth > 0}
      <div class="row info">
        <span>Rainfall depth: {rainfallDepth.toFixed(2)} in</span>
        {#if rainfallIntensity != null}
          <span>Intensity: {rainfallIntensity.toFixed(2)} in/hr</span>
        {/if}
      </div>
      <div class="row">
        <label>
          Curve Number:
          <input type="number" min="30" max="100" bind:value={cn} step="1" />
        </label>
        <button on:click={computeRunoffValues}>Compute Runoff</button>
      </div>
    {/if}
    {#if runoffDepth > 0}
      <div class="row info">
        <span>Runoff depth: {runoffDepth.toFixed(2)} in</span>
        <span>Runoff volume: {runoffVolume.toFixed(2)} acre‑ft</span>
        <span>Runoff coeff: {runoffCoeff.toFixed(2)}</span>
        {#if peakFlow > 0}
          <span>Peak discharge: {peakFlow.toFixed(2)} cfs</span>
        {/if}
      </div>
      <button on:click={exportSwmm}>Export SWMM</button>
    {/if}
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </div>
  <div id="map" bind:this={mapDiv}></div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100vh;
  }
  .controls {
    padding: 0.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #ddd;
  }
  .controls .row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .controls label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
  }
  .controls input[type='number'],
  .controls select {
    padding: 0.25rem;
    font-size: 0.9rem;
    width: 8rem;
  }
  .controls button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .controls .info {
    font-weight: 500;
  }
  #map {
    flex-grow: 1;
  }
  .error {
    color: #b00020;
    margin-top: 0.5rem;
  }
</style>