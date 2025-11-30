<script lang="ts">
  import type { ApiHealthStatus } from "../services/health";

  export let status: ApiHealthStatus;
  export let onRefresh: () => void;

  const statusCopy: Record<ApiHealthStatus, string> = {
    unknown: "Unknown",
    checking: "Checking…",
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
  };
</script>

<div class="api-health">
  <div class={`status-badge ${status}`}>
    <span class="dot"></span>
    <span class="label">API: {statusCopy[status]}</span>
  </div>
  <button
    class="refresh-btn"
    on:click={onRefresh}
    aria-label="Refresh API status"
    title="Refresh API status"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M23 4v6h-6"></path>
      <path d="M1 20v-6h6"></path>
      <path
        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
      ></path>
    </svg>
  </button>
</div>

<style>
  .api-health {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 600;
    background: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-badge.online {
    background: rgba(5, 150, 105, 0.1);
    color: var(--success-color);
    border-color: rgba(5, 150, 105, 0.2);
  }

  .status-badge.offline {
    background: rgba(220, 38, 38, 0.1);
    color: var(--error-color);
    border-color: rgba(220, 38, 38, 0.2);
  }

  .status-badge.degraded {
    background: rgba(217, 119, 6, 0.1);
    color: var(--warning-color);
    border-color: rgba(217, 119, 6, 0.2);
  }

  .status-badge.checking {
    background: rgba(37, 99, 235, 0.1);
    color: var(--primary-color);
    border-color: rgba(37, 99, 235, 0.2);
  }

  .refresh-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.35rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    transform: rotate(180deg);
  }
</style>
