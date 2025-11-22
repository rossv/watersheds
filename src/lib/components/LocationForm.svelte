<script lang="ts">
  export let lat: number;
  export let lon: number;
  export let delineated: boolean;
  export let areaAc: number;
  export let isDelineating: boolean;
  export let onLatChange: (lat: number) => void;
  export let onLonChange: (lon: number) => void;
  export let onDelineate: () => void;
</script>

<section class="card">
  <h2>Location</h2>
  <p class="helper-text">Tap the map or type coordinates below.</p>
  <div class="row">
    <label>
      Latitude
      <input
        type="number"
        bind:value={lat}
        step="0.0001"
        on:change={(e) => onLatChange(parseFloat((e.currentTarget as HTMLInputElement).value))}
      />
    </label>
    <label>
      Longitude
      <input
        type="number"
        bind:value={lon}
        step="0.0001"
        on:change={(e) => onLonChange(parseFloat((e.currentTarget as HTMLInputElement).value))}
      />
    </label>
  </div>
  <button class="primary" on:click={onDelineate} disabled={isDelineating} aria-busy={isDelineating}>
    {#if isDelineating}
      <span class="spinner" aria-hidden="true"></span>
      Fetching watershed…
    {:else}
      Delineate watershed
    {/if}
  </button>
  <p class="status" aria-live="polite">
    {#if isDelineating}
      Status: Fetching watershed…
    {:else if delineated}
      Status: Ready • {areaAc.toFixed(2)} acres
    {:else}
      Status: Ready
    {/if}
  </p>
</section>

<style>
  .spinner {
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    border: 2px solid rgba(255, 255, 255, 0.7);
    border-top-color: white;
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
    margin-top: 0.5rem;
    color: #52606d;
    font-size: 0.95rem;
  }
</style>
