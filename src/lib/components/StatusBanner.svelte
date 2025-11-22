<script lang="ts">
  export let message: string;
</script>

{#if message}
  <section class="card error-card" role="alert">
    <h2>Heads up</h2>
    <p>{message}</p>
  </section>
{/if}
