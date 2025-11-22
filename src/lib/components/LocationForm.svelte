<script lang="ts">
  export let lat: number;
  export let lon: number;
  export let delineated: boolean;
  export let areaAc: number;
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
  <button class="primary" on:click={onDelineate}>Delineate watershed</button>
  {#if delineated}
    <p class="status">Boundary ready: {areaAc.toFixed(2)} acres</p>
  {/if}
</section>
