<script lang="ts">
  import LandUseTable from "./LandUseTable.svelte";
  import type { LandUseItem } from "../store";

  export let cn: number;
  export let landUseItems: LandUseItem[] = [];
  export let isFetchingLandUse: boolean = false;
  export let runoffDepth: number;
  export let runoffVolume: number;
  export let runoffCoeff: number;
  export let peakFlow: number;
  export let rainfallDepth: number;
  export let onCurveChange: (cn: number) => void;
  export let onLandUseChange: (items: LandUseItem[]) => void;
  export let onFetchLandUse: () => void;
  export let onCompute: () => void;
  export let onExport: () => void;
  export let onSaveScenario: () => void;

  function handleCurveChange(e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value;
    onCurveChange(parseFloat(value));
  }
</script>

<section class="card">
  <h2>Runoff</h2>
  <p class="helper-text">Curve Number defaults to mixed suburban land use.</p>
  <div class="row">
    <label>
      Composite Curve Number
      <input
        type="number"
        min="30"
        max="100"
        bind:value={cn}
        step="1"
        on:change={handleCurveChange}
        disabled={landUseItems.length > 0}
      />
    </label>
  </div>

  <LandUseTable
    items={landUseItems}
    onChange={onLandUseChange}
    onFetch={onFetchLandUse}
    isFetching={isFetchingLandUse}
  />

  <div class="runoff-actions">
    <button class="primary" on:click={onCompute} disabled={!rainfallDepth}
      >Compute runoff</button
    >
    <button
      class="secondary"
      on:click={onSaveScenario}
      disabled={!rainfallDepth}>Save scenario</button
    >
  </div>
  {#if runoffDepth > 0}
    <div class="summary">
      <span>Runoff depth: {runoffDepth.toFixed(2)} in</span>
      <span>Volume: {runoffVolume.toFixed(2)} acre‑ft</span>
      <span>Coeff: {runoffCoeff.toFixed(2)}</span>
      {#if peakFlow > 0}
        <span>Peak flow: {peakFlow.toFixed(2)} cfs</span>
      {/if}
    </div>
    <button class="secondary" on:click={onExport}>Export SWMM file</button>
  {/if}
</section>
