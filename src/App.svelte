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
  import { actions, appState } from "./lib/store";

  onMount(() => {
    actions.checkApiHealth();
  });
</script>

<div class="app">
  <header class="hero">
    <h1>Watershed Response Explorer</h1>
    <p>
      Pick a location, delineate its watershed, and evaluate rainfall-driven
      runoff in just a few taps. Follow the guided steps below for the best
      experience on any device.
    </p>
  </header>

  <div class="content">
    <aside class="sidebar" aria-label="Workflow instructions">
      <section class="card">
        <h2>How to get started</h2>
        <ol>
          <li>
            <strong>Pan or tap</strong> on the map to drop the location marker.
          </li>
          <li>
            Enter precise latitude and longitude if you need accuracy, then
            choose <em>Delineate</em>.
          </li>
          <li>
            After the boundary appears, fetch design storm depths and select the
            duration/ARI pair that matches your scenario.
          </li>
          <li>
            Adjust the curve number (CN) and compute runoff to review depths,
            volumes, and peak discharge.
          </li>
          <li>
            Export to SWMM to continue hydraulic modeling in your preferred
            workflow.
          </li>
        </ol>
      </section>

      <section class="card tips">
        <h3>UX tips</h3>
        <ul>
          <li>Use two fingers to zoom the map on mobile.</li>
          <li>The marker is draggable—press and hold before moving it.</li>
          <li>
            Rainfall tables occasionally take a few seconds to download. Stay on
            the screen until options appear.
          </li>
          <li>
            Calculated results update each time you change rainfall or CN
            inputs.
          </li>
        </ul>
      </section>

      <ApiHealthIndicator
        status={$appState.apiHealth}
        onRefresh={actions.checkApiHealth}
      />
      <SavedScenarios scenarios={$appState.savedScenarios} />
      <AnalyticsSidebar />
    </aside>

    <main class="workflow" aria-label="Watershed configuration">
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
    </main>

    <MapPanel
      lat={$appState.lat}
      lon={$appState.lon}
      watershed={$appState.watershed}
      delineated={$appState.delineated}
      onLocationChange={actions.setLatLon}
    />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    background: #f3f4f6;
    color: #1f2933;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .hero {
    padding: 1.5rem clamp(1rem, 3vw, 2.5rem);
    background: linear-gradient(135deg, #0b7285, #31a69d);
    color: white;
    text-align: left;
  }

  .hero h1 {
    margin: 0 0 0.5rem;
    font-size: clamp(1.5rem, 5vw, 2.4rem);
  }

  .hero p {
    margin: 0;
    max-width: 48rem;
    line-height: 1.5;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: clamp(1rem, 3vw, 2.5rem);
    flex: 1;
  }

  .sidebar,
  .workflow {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card {
    background: white;
    padding: 1rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px -20px rgba(15, 23, 42, 0.35);
  }

  .card h2,
  .card h3 {
    margin-top: 0;
    margin-bottom: 0.75rem;
  }

  .card p {
    margin-top: 0;
  }

  .card ol,
  .card ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .card li + li {
    margin-top: 0.5rem;
  }

  .tips ul {
    list-style: disc;
  }

  .workflow .row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.95rem;
    font-weight: 500;
  }

  input[type="number"],
  select {
    padding: 0.55rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #cbd5e1;
    font-size: 1rem;
    background: #fff;
    color: inherit;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  button:focus-visible {
    outline: 3px solid #0ea5e9;
    outline-offset: 2px;
  }

  button.primary {
    background: #0f766e;
    color: white;
    box-shadow: 0 10px 20px -10px rgba(15, 118, 110, 0.6);
  }

  button.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -12px rgba(15, 118, 110, 0.55);
  }

  button.secondary {
    background: #e2e8f0;
    color: #0f172a;
  }

  button.secondary:hover {
    transform: translateY(-1px);
  }

  .helper-text {
    color: #52606d;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .status {
    margin-top: 0.75rem;
    font-weight: 600;
    color: #0f766e;
  }

  .summary {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
    color: #0f172a;
  }

  .error-card {
    border-left: 4px solid #f97316;
  }

  .error-card h2 {
    color: #d9480f;
  }

  .future-list {
    margin: 0;
    padding-left: 1.1rem;
    color: #1f2933;
  }

  .future-list li + li {
    margin-top: 0.35rem;
  }

  .scenario-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .scenario-title {
    font-weight: 700;
  }

  .scenario-meta {
    color: #52606d;
    font-size: 0.95rem;
  }

  .runoff-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  @media (min-width: 960px) {
    .content {
      flex-direction: row;
      align-items: flex-start;
    }

    .sidebar {
      flex: 0 0 320px;
    }

    .workflow {
      flex: 0 0 360px;
    }

    .workflow .row {
      flex-direction: row;
      justify-content: space-between;
    }

    .workflow .row label {
      flex: 1;
    }

    .workflow .row label + label {
      margin-left: 1rem;
    }

    .summary {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
  }
</style>
