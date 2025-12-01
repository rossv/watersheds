<script lang="ts">
  import { onMount } from "svelte";
  import AnalyticsSidebar from "./lib/components/AnalyticsSidebar.svelte";
  import ApiHealthIndicator from "./lib/components/ApiHealthIndicator.svelte";
  import LocationForm from "./lib/components/LocationForm.svelte";
  import MapPanel from "./lib/components/MapPanel.svelte";
  import RainfallPanel from "./lib/components/RainfallPanel.svelte";
  import RunoffPanel from "./lib/components/RunoffPanel.svelte";
  import SavedScenarios from "./lib/components/SavedScenarios.svelte";
  import StatusBanner from "./lib/components/StatusBanner.svelte";
  import ThemeToggle from "./lib/components/ThemeToggle.svelte";
  import { actions, appState } from "./lib/store";

  onMount(() => {
    actions.checkApiHealth();
  });
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <div class="brand">
        <h1>Watershed Explorer</h1>
      </div>
      <div class="header-actions">
        <ApiHealthIndicator
          status={$appState.apiHealth}
          onRefresh={actions.checkApiHealth}
        />
        <ThemeToggle />
      </div>
    </div>
  </header>

  <div class="main-layout">
    <aside class="sidebar">
      <div class="sidebar-content">
        <section class="card intro-card">
          <h2>Get Started</h2>
          <ol>
            <li><strong>Tap map</strong> to set location</li>
            <li><strong>Delineate</strong> watershed</li>
            <li><strong>Fetch</strong> rainfall data</li>
            <li><strong>Compute</strong> runoff</li>
          </ol>
        </section>

        <SavedScenarios scenarios={$appState.savedScenarios} />
        <AnalyticsSidebar />
      </div>
    </aside>

    <main class="workflow">
      <div class="workflow-grid">
        <div class="col-left">
          <LocationForm
            lat={$appState.lat}
            lon={$appState.lon}
            delineated={$appState.delineated}
            isDelineating={$appState.isDelineating}
            areaAc={$appState.areaAc}
            onLatChange={actions.setLat}
            onLonChange={actions.setLon}
            onDelineate={actions.delineate}
          />

          <MapPanel
            lat={$appState.lat}
            lon={$appState.lon}
            watershed={$appState.watershed}
            delineated={$appState.delineated}
            onLocationChange={actions.setLatLon}
          />
        </div>

        <div class="col-right">
          {#if $appState.delineated}
            <RainfallPanel
              rainfallTable={$appState.rainfallTable}
              durations={$appState.durations}
              aris={$appState.aris}
              selectedDuration={$appState.selectedDuration}
              selectedAri={$appState.selectedAri}
              rainfallDepth={$appState.rainfallDepth}
              rainfallIntensity={$appState.rainfallIntensity}
              isFetchingRainfall={$appState.isFetchingRainfall}
              onFetch={actions.fetchRainfall}
              onSelectDuration={actions.selectDuration}
              onSelectAri={actions.selectAri}
            />
          {/if}

          {#if $appState.rainfallDepth > 0}
            <RunoffPanel
              cn={$appState.cn}
              landUseItems={$appState.landUseItems}
              isFetchingLandUse={$appState.isFetchingLandUse}
              runoffDepth={$appState.runoffDepth}
              runoffVolume={$appState.runoffVolume}
              runoffCoeff={$appState.runoffCoeff}
              peakFlow={$appState.peakFlow}
              rainfallDepth={$appState.rainfallDepth}
              onCurveChange={actions.updateCurveNumber}
              onLandUseChange={actions.updateLandUseItems}
              onFetchLandUse={actions.fetchLandUseData}
              onCompute={actions.computeRunoffValues}
              onExport={actions.exportSwmm}
              onSaveScenario={actions.addScenario}
            />
          {/if}
        </div>
      </div>
    </main>
  </div>
</div>

<style>
  :global(:root) {
    /* Light Mode Variables */
    --bg-body: #f8fafc;
    --bg-card: #ffffff;
    --bg-hover: #f1f5f9;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
    --text-tertiary: #94a3b8;
    --border-color: #e2e8f0;
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    --primary-text: #ffffff;
    --success-color: #059669;
    --warning-color: #d97706;
    --error-color: #dc2626;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
  }

  :global(.dark) {
    /* Dark Mode Variables */
    --bg-body: #0f172a;
    --bg-card: #1e293b;
    --bg-hover: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-color: #334155;
    --primary-color: #3b82f6;
    --primary-hover: #60a5fa;
    --primary-text: #ffffff;
    --success-color: #34d399;
    --warning-color: #fbbf24;
    --error-color: #f87171;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4),
      0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }

  :global(body) {
    margin: 0;
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      sans-serif;
    background: var(--bg-body);
    color: var(--text-primary);
    transition:
      background-color 0.3s ease,
      color 0.3s ease;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    position: sticky;
    top: 0;
    z-index: 50;
    transition:
      background-color 0.3s ease,
      border-color 0.3s ease;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    background: linear-gradient(135deg, var(--primary-color), #06b6d4);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .main-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    flex: 1;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 5rem;
  }

  .workflow {
    flex: 1;
  }

  .workflow-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .card {
    background: var(--bg-card);
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
  }

  .card h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .intro-card ol {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  :global(input[type="number"]),
  :global(select) {
    padding: 0.6rem 0.85rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    font-size: 0.95rem;
    background: var(--bg-card);
    color: var(--text-primary);
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
  }

  :global(input[type="number"]:hover),
  :global(select:hover) {
    border-color: var(--text-tertiary);
  }

  :global(input[type="number"]:focus),
  :global(select:focus) {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  :global(button) {
    border: none;
    border-radius: var(--radius-md);
    padding: 0.6rem 1.25rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  :global(button:focus-visible) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  :global(button.primary) {
    background: var(--primary-color);
    color: white;
    box-shadow:
      0 4px 6px -1px rgba(37, 99, 235, 0.2),
      0 2px 4px -1px rgba(37, 99, 235, 0.1);
  }

  :global(button.primary:hover) {
    background: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow:
      0 6px 8px -1px rgba(37, 99, 235, 0.25),
      0 3px 6px -1px rgba(37, 99, 235, 0.15);
  }

  :global(button.primary:active) {
    transform: translateY(0);
  }

  :global(button.secondary) {
    background: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  :global(button.secondary:hover) {
    background: var(--border-color);
    color: var(--text-primary);
    border-color: var(--text-tertiary);
  }

  @media (min-width: 1024px) {
    .main-layout {
      flex-direction: row;
      align-items: flex-start;
    }

    .sidebar {
      flex: 0 0 280px;
    }

    .workflow-grid {
      grid-template-columns: repeat(2, 1fr);
      align-items: start;
    }
  }
</style>
