<script lang="ts">
  import type { SavedScenario } from '../store';

  export let scenarios: SavedScenario[];
</script>

<section class="card">
  <h2>Saved scenarios</h2>
  {#if scenarios.length === 0}
    <p class="helper-text">No saved scenarios yet. Save a run to build your library.</p>
  {:else}
    <ul class="scenario-list">
      {#each scenarios as scenario}
        <li>
          <div class="scenario-title">{scenario.label}</div>
          <div class="scenario-meta">
            {scenario.lat.toFixed(4)}, {scenario.lon.toFixed(4)} · CN {scenario.cn}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
