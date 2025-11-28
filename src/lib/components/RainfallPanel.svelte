<script lang="ts">
  import type { RainfallTable } from "../services/noaa";

  export let rainfallTable: RainfallTable | null;
  export let durations: string[];
  export let aris: string[];
  export let selectedDuration: string;
  export let selectedAri: string;
  export let rainfallDepth: number;
  export let rainfallIntensity: number | null;
  export let isFetchingRainfall: boolean;
  export let onFetch: () => void;
  export let onSelectDuration: (duration: string) => void;
  export let onSelectAri: (ari: string) => void;

  function handleDurationChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    onSelectDuration(value);
  }

  function handleAriChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    onSelectAri(value);
  }
</script>

<section class="card">
  <h2>Rainfall</h2>
  <p class="helper-text">Fetch NOAA Atlas 14 data near your location.</p>
  <button
    class="secondary"
    on:click={onFetch}
    disabled={isFetchingRainfall}
    aria-busy={isFetchingRainfall}
  >
    {#if isFetchingRainfall}
      <span class="spinner" aria-hidden="true"></span>
      Fetching rainfall…
    {:else}
      Fetch rainfall table
    {/if}
  </button>
  <p class="status" aria-live="polite">
    {#if isFetchingRainfall}
      Status: Fetching rainfall…
    {:else if rainfallTable}
      Status: Ready
    {:else}
      Status: Ready to fetch
    {/if}
  </p>
  {#if rainfallTable}
    <div class="row">
      <label>
        Duration
        <select
          bind:value={selectedDuration}
          disabled={isFetchingRainfall}
          on:change={handleDurationChange}
        >
          {#each durations as d}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </label>
      <label>
        ARI (years)
        <select
          bind:value={selectedAri}
          disabled={isFetchingRainfall}
          on:change={handleAriChange}
        >
          {#each aris as a}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </label>
    </div>
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

<style>
  .spinner {
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    border: 2px solid rgba(15, 23, 42, 0.25);
    border-top-color: #0f172a;
    display: inline-block;
    margin-right: 0.5rem;
    animation: spin 0.8s linear infinite;
    vertical-align: middle;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .status {
    margin: 0.75rem 0 0.25rem;
    color: #52606d;
    font-size: 0.95rem;
  }
</style>
