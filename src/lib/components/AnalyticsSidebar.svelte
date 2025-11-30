<script lang="ts">
  import { appState } from "../store";
  import Hydrograph from "./Hydrograph.svelte";

  $: hasResults = $appState.peakFlow > 0;
  $: durationHours = parseDuration($appState.selectedDuration);

  function parseDuration(d: string): number {
    if (!d) return 0;
    if (d.includes("min")) return parseFloat(d) / 60;
    if (d.includes("hr")) return parseFloat(d);
    if (d.includes("day")) return parseFloat(d) * 24;
    return 0;
  }
</script>

<section class="card">
  <h2>Analytics</h2>
  {#if !hasResults}
    <p class="helper-text">
      Delineate a watershed and compute runoff to see analytics.
    </p>
  {:else}
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Peak Flow</div>
        <div class="value">
          {$appState.peakFlow.toFixed(1)} <span class="unit">cfs</span>
        </div>
      </div>
      <div class="kpi">
        <div class="label">Runoff Vol</div>
        <div class="value">
          {$appState.runoffVolume.toFixed(1)} <span class="unit">ac-ft</span>
        </div>
      </div>
      <div class="kpi">
        <div class="label">Coeff (C)</div>
        <div class="value">{$appState.runoffCoeff.toFixed(2)}</div>
      </div>
    </div>

    <div class="chart-section">
      <h3>Hydrograph (Approximation)</h3>
      <Hydrograph peakFlow={$appState.peakFlow} duration={durationHours} />
    </div>
  {/if}
</section>

<style>
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .kpi {
    background: var(--bg-body);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    text-align: center;
    border: 1px solid var(--border-color);
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-color);
  }

  .unit {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-tertiary);
  }

  .chart-section h3 {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 0.75rem 0;
  }
</style>
