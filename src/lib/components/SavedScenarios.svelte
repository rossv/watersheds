<script lang="ts">
  import type { SavedScenario } from "../store";
  import { actions } from "../store";

  export let scenarios: SavedScenario[];
</script>

<section class="card">
  <h2>Saved scenarios</h2>
  {#if scenarios.length === 0}
    <p class="helper-text">
      No saved scenarios yet. Save a run to build your library.
    </p>
  {:else}
    <ul class="scenario-list">
      {#each scenarios as scenario (scenario.id)}
        <li>
          <div class="scenario-info">
            <div class="scenario-title">{scenario.label}</div>
            <div class="scenario-meta">
              {scenario.lat.toFixed(4)}, {scenario.lon.toFixed(4)} · CN {scenario.cn}
            </div>
          </div>
          <div class="scenario-actions">
            <button
              class="secondary small"
              on:click={() => actions.loadScenario(scenario)}>Load</button
            >
            <button
              class="icon-btn delete"
              on:click={() => actions.deleteScenario(scenario.id)}
              title="Delete"
            >
              ×
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .scenario-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-body);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .scenario-info {
    flex: 1;
  }

  .scenario-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .scenario-meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .scenario-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  button.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
  }

  button.icon-btn {
    padding: 0.25rem;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 1.25rem;
    line-height: 1;
  }

  button.icon-btn:hover {
    color: var(--error-color);
    background: rgba(220, 38, 38, 0.1);
  }
</style>
