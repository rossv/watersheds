<script lang="ts">
  import { TR55_CATEGORIES, getCn, type HSG } from "../cnTable";
  import type { LandUseItem } from "../store";

  export let items: LandUseItem[] = [];
  export let onChange: (items: LandUseItem[]) => void;
  export let onFetch: () => void;
  export let isFetching: boolean = false;

  function addItem() {
    const newItem: LandUseItem = {
      id: crypto.randomUUID(),
      categoryId: TR55_CATEGORIES[0].id,
      hsg: "C",
      percentage: 0,
    };
    onChange([...items, newItem]);
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, updates: Partial<LandUseItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  function updateItemHsg(id: string, value: string) {
    updateItem(id, { hsg: value as HSG });
  }

  $: totalPercentage = items.reduce((sum, i) => sum + i.percentage, 0);
  $: compositeCn =
    totalPercentage > 0
      ? Math.round(
          items.reduce(
            (sum, i) => sum + getCn(i.categoryId, i.hsg) * i.percentage,
            0,
          ) / totalPercentage,
        )
      : 0;

  // Group categories for the dropdown
  const categories = TR55_CATEGORIES;
</script>

<div class="land-use-table">
  <div class="header">
    <h3>Land Use Breakdown</h3>
    <div class="actions">
      <button class="secondary small" on:click={onFetch} disabled={isFetching}>
        {isFetching ? "Fetching..." : "Auto-fill (Experimental)"}
      </button>
      <button class="secondary small" on:click={addItem}>+ Add Row</button>
    </div>
  </div>

  {#if items.length === 0}
    <p class="empty-state">
      Add land use categories to calculate a composite Curve Number.
    </p>
  {:else}
    <div class="rows">
      {#each items as item (item.id)}
        <div class="row-card">
          <div class="row-header">
            <select
              value={item.categoryId}
              on:change={(e) =>
                updateItem(item.id, { categoryId: e.currentTarget.value })}
            >
              {#each categories as cat}
                <option value={cat.id}>{cat.label}</option>
              {/each}
            </select>
            <button
              class="icon-btn"
              on:click={() => removeItem(item.id)}
              aria-label="Remove">×</button
            >
          </div>

          <div class="row-controls">
            <label class="hsg-label">
              HSG:
              <select
                value={item.hsg}
                on:change={(e) => updateItemHsg(item.id, e.currentTarget.value)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </label>

            <label class="pct-label">
              Area: {item.percentage}%
              <input
                type="range"
                min="0"
                max="100"
                value={item.percentage}
                on:input={(e) =>
                  updateItem(item.id, {
                    percentage: parseInt(e.currentTarget.value),
                  })}
              />
            </label>

            <div class="cn-badge">
              CN: {getCn(item.categoryId, item.hsg)}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="footer">
      <div class="total-row" class:warning={totalPercentage !== 100}>
        <span>Total Area: {totalPercentage}%</span>
        {#if totalPercentage !== 100}
          <span class="warning-text">(Should be 100%)</span>
        {/if}
      </div>
      <div class="composite-row">
        <strong>Composite CN: {compositeCn}</strong>
      </div>
    </div>
  {/if}
</div>

<style>
  .land-use-table {
    margin-top: 1rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .small {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }

  .empty-state {
    color: var(--text-secondary);
    font-style: italic;
    font-size: 0.9rem;
    text-align: center;
    padding: 1rem;
    background: var(--bg-hover);
    border-radius: 0.5rem;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .row-card {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  .row-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .row-header select {
    flex: 1;
    font-size: 0.9rem;
    padding: 0.3rem;
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.25rem;
  }

  .icon-btn:hover {
    color: var(--error-color);
  }

  .row-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .hsg-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .hsg-label select {
    padding: 0.2rem;
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
  }

  .pct-label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pct-label input {
    flex: 1;
  }

  .cn-badge {
    background: var(--bg-card);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .footer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .total-row.warning {
    color: var(--warning-color);
  }

  .warning-text {
    font-size: 0.85rem;
  }
</style>
