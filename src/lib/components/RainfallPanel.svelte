<script lang="ts">
  import type { RainfallTable } from '../services/noaa';

  export let rainfallTable: RainfallTable | null;
  export let durations: string[];
  export let aris: string[];
  export let selectedDuration: string;
  export let selectedAri: string;
  export let rainfallDepth: number;
  export let rainfallIntensity: number | null;
  export let onFetch: () => void;
  export let onSelectDuration: (duration: string) => void;
  export let onSelectAri: (ari: string) => void;
</script>

<section class="card">
  <h2>Rainfall</h2>
  <p class="helper-text">Fetch NOAA Atlas 14 data near your location.</p>
  <button class="secondary" on:click={onFetch}>Fetch rainfall table</button>
  {#if rainfallTable}
    <div class="row">
      <label>
        Duration
        <select
          bind:value={selectedDuration}
          on:change={(e) => onSelectDuration((e.currentTarget as HTMLSelectElement).value)}
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
          on:change={(e) => onSelectAri((e.currentTarget as HTMLSelectElement).value)}
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
