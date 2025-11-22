<script lang="ts">
  import type { ApiHealthStatus } from '../services/health';

  export let status: ApiHealthStatus;
  export let onRefresh: () => void;

  const statusCopy: Record<ApiHealthStatus, string> = {
    unknown: 'Unknown',
    checking: 'Checking…',
    online: 'Online',
    degraded: 'Degraded',
    offline: 'Offline'
  };
</script>

<section class="card api-card">
  <div class="api-header">
    <h2>API health</h2>
    <button class="secondary" on:click={onRefresh}>Refresh</button>
  </div>
  <p class={`status-pill ${status}`}>
    <span class="dot"></span>
    {statusCopy[status]}
  </p>
  <p class="helper-text">Heartbeat pings a lightweight endpoint to spot outages early.</p>
</section>

<style>
  .api-card {
    gap: 0.75rem;
  }

  .api-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    font-weight: 600;
    background: #e2e8f0;
    color: #0f172a;
  }

  .status-pill .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: currentColor;
    display: inline-block;
  }

  .status-pill.online {
    background: #ecfdf3;
    color: #047857;
  }

  .status-pill.offline {
    background: #fef2f2;
    color: #b91c1c;
  }

  .status-pill.degraded {
    background: #fff7ed;
    color: #c2410c;
  }

  .status-pill.checking {
    background: #eff6ff;
    color: #1d4ed8;
  }
</style>
