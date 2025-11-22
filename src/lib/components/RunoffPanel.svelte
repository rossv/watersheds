<script lang="ts">
  export let cn: number;
  export let runoffDepth: number;
  export let runoffVolume: number;
  export let runoffCoeff: number;
  export let peakFlow: number;
  export let rainfallDepth: number;
  export let onCurveChange: (cn: number) => void;
  export let onCompute: () => void;
  export let onExport: () => void;
  export let onSaveScenario: () => void;
</script>

<section class="card">
  <h2>Runoff</h2>
  <p class="helper-text">Curve Number defaults to mixed suburban land use.</p>
  <div class="row">
    <label>
      Curve Number (30–100)
      <input
        type="number"
        min="30"
        max="100"
        bind:value={cn}
        step="1"
        on:change={(e) => onCurveChange(parseFloat((e.currentTarget as HTMLInputElement).value))}
      />
    </label>
  </div>
  <div class="runoff-actions">
    <button class="primary" on:click={onCompute} disabled={!rainfallDepth}>Compute runoff</button>
    <button class="secondary" on:click={onSaveScenario} disabled={!rainfallDepth}>Save scenario</button>
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
