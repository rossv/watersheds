<script lang="ts">
    import { afterUpdate } from "svelte";

    export let logs: string[] = [];

    let logContainer: HTMLElement;

    afterUpdate(() => {
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    });
</script>

<section class="card progress-box">
    <h2>Activity Log</h2>
    <div class="log-container" bind:this={logContainer}>
        {#if logs.length === 0}
            <p class="placeholder">No activity yet...</p>
        {:else}
            {#each logs as log}
                <div class="log-entry">{log}</div>
            {/each}
        {/if}
    </div>
</section>

<style>
    .progress-box {
        display: flex;
        flex-direction: column;
        height: 200px;
        padding: 1rem;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1rem;
        color: var(--text-primary);
    }

    .log-container {
        flex: 1;
        overflow-y: auto;
        background: var(--bg-body);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 0.5rem;
        font-family: monospace;
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .log-entry {
        margin-bottom: 0.25rem;
        line-height: 1.4;
    }

    .placeholder {
        color: var(--text-tertiary);
        font-style: italic;
        margin: 0;
    }
</style>
