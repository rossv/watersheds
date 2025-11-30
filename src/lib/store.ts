import { get, writable } from "svelte/store";
import { saveSwmmInp, type SwmmSubcatchment } from "./export";
import { computeRunoffDepthCN, computeRunoffVolume, computeRationalPeak } from "./runoff";
import { fetchApiHealth, type ApiHealthStatus } from "./services/health";
import { delineateBasin, type WatershedGeoJSON } from "./services/delineation";
import { fetchRainfall as fetchRainfallWithFallback } from "./services/rainfall";
import type { RainfallTable } from "./rainfall";
import { computeAreaSqMeters } from "./utils/geometry";
import { type HSG, getCn } from "./cnTable";
import { fetchLandUse } from "./services/landuse";

export type LandUseItem = {
  id: string;
  categoryId: string;
  hsg: HSG;
  percentage: number;
};

export type SavedScenario = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  cn: number;
  rainfallDepth: number;
  ari: string;
  duration: string;
  landUseItems: LandUseItem[];
};

export type AppState = {
  lat: number;
  lon: number;
  cn: number;
  landUseItems: LandUseItem[];
  delineated: boolean;
  isDelineating: boolean;
  watershed: WatershedGeoJSON | null;
  delineationSource: string;
  areaAc: number;
  rainfallTable: RainfallTable | null;
  durations: string[];
  aris: string[];
  selectedDuration: string;
  selectedAri: string;
  rainfallDepth: number;
  rainfallIntensity: number | null;
  rainfallSource: string;
  runoffDepth: number;
  runoffVolume: number;
  runoffCoeff: number;
  peakFlow: number;
  error: string;
  isFetchingRainfall: boolean;
  isFetchingLandUse: boolean;
  apiHealth: ApiHealthStatus;
  savedScenarios: SavedScenario[];
};

const initialState: AppState = {
  lat: 40.4406,
  lon: -79.9959,
  cn: 70,
  landUseItems: [],
  delineated: false,
  isDelineating: false,
  watershed: null,
  delineationSource: "",
  areaAc: 0,
  rainfallTable: null,
  durations: [],
  aris: [],
  selectedDuration: "",
  selectedAri: "",
  rainfallDepth: 0,
  rainfallIntensity: null,
  rainfallSource: "",
  runoffDepth: 0,
  runoffVolume: 0,
  runoffCoeff: 0,
  peakFlow: 0,
  error: "",
  isFetchingRainfall: false,
  isFetchingLandUse: false,
  apiHealth: "unknown",

  savedScenarios: JSON.parse(localStorage.getItem("savedScenarios") || "[]")
};

export const appState = writable<AppState>(initialState);

appState.subscribe((state) => {
  localStorage.setItem("savedScenarios", JSON.stringify(state.savedScenarios));
});

function resetCalculations(state: AppState): AppState {
  return {
    ...state,
    delineated: false,
    isDelineating: false,
    isFetchingRainfall: false,
    watershed: null,
    delineationSource: "",
    areaAc: 0,
    rainfallTable: null,
    durations: [],
    aris: [],
    selectedDuration: "",
    selectedAri: "",
    rainfallDepth: 0,
    rainfallIntensity: null,
    rainfallSource: "",
    runoffDepth: 0,
    runoffVolume: 0,
    runoffCoeff: 0,
    peakFlow: 0
  };
}

function resetRainfall(state: AppState): AppState {
  return {
    ...state,
    isFetchingRainfall: false,
    rainfallTable: null,
    durations: [],
    aris: [],
    selectedDuration: "",
    selectedAri: "",
    rainfallDepth: 0,
    rainfallIntensity: null,
    rainfallSource: "",
    runoffDepth: 0,
    runoffVolume: 0,
    runoffCoeff: 0,
    peakFlow: 0
  };
}

function selectDurationAndAri(state: AppState, duration?: string, ari?: string): AppState {
  const d = duration ?? state.selectedDuration;
  const a = ari ?? state.selectedAri;
  if (!state.rainfallTable) return state;
  const row = state.rainfallTable.rows.find((r) => r.label === d);
  if (!row) return state;
  const val = row.values[a];
  const rainfallDepth = Number.isFinite(val) ? val : 0;
  const hours = durationToHours(d);
  const rainfallIntensity = hours > 0 ? rainfallDepth / hours : null;
  return {
    ...state,
    selectedDuration: d,
    selectedAri: a,
    rainfallDepth,
    rainfallIntensity,
    runoffDepth: 0,
    runoffVolume: 0,
    runoffCoeff: 0,
    peakFlow: 0
  };
}

function durationToHours(label: string): number {
  const m = label.toLowerCase().match(/(\d+(?:\.\d+)?)[^\d]*(min|minute|minutes|hr|hour|hours|day|days)/);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  const unit = m[2];
  if (unit.startsWith("min")) return value / 60;
  if (unit.startsWith("hr")) return value;
  if (unit.startsWith("day")) return value * 24;
  return value;
}

async function delineate() {
  appState.update((s) => ({ ...resetCalculations(s), isDelineating: true }));
  try {
    const { lat, lon } = get(appState);
    const result = await delineateBasin(lat, lon);
    const areaM2 = computeAreaSqMeters(result.basin);
    const areaAc = areaM2 * 0.000247105;
    appState.update((s) => ({
      ...s,
      watershed: result.basin,
      delineationSource: result.source,
      areaAc,
      delineated: true,
      isDelineating: false,
      error: ""
    }));
  } catch (ex) {
    const message = (ex as Error).message;
    appState.update((s) => ({ ...s, isDelineating: false, error: message }));
  }
}

async function fetchRainfall() {
  appState.update((s) => ({ ...resetRainfall(s), isFetchingRainfall: true }));
  try {
    const { lat, lon } = get(appState);
    const { table, source, stale } = await fetchRainfallWithFallback(lat, lon);
    appState.update((s) => {
      const durations = table.rows.map((r) => r.label);
      const aris = table.aris;
      const nextState = {
        ...s,
        rainfallTable: table,
        durations,
        aris,
        selectedDuration: durations[0] ?? "",
        selectedAri: aris[0] ?? "",
        isFetchingRainfall: false,
        rainfallSource: source + (stale ? " (stale)" : ""),
        error: "",
      };
      return selectDurationAndAri(nextState);
    });
  } catch (ex) {
    const message = (ex as Error).message;
    appState.update((s) => ({ ...s, isFetchingRainfall: false, error: message }));
  }
}

function computeRunoffValues() {
  appState.update((s) => {
    if (!s.rainfallDepth || !s.areaAc) return s;
    const runoffDepth = computeRunoffDepthCN(s.rainfallDepth, s.cn);
    const runoffVolume = computeRunoffVolume(s.areaAc, runoffDepth);
    const runoffCoeff = s.rainfallDepth > 0 ? runoffDepth / s.rainfallDepth : 0;
    const peakFlow =
      s.rainfallIntensity != null
        ? computeRationalPeak(s.rainfallIntensity, runoffCoeff, s.areaAc)
        : 0;
    return {
      ...s,
      runoffDepth,
      runoffVolume,
      runoffCoeff,
      peakFlow
    };
  });
}

function updateCurveNumber(cn: number) {
  appState.update((s) => ({ ...s, cn }));
}

function updateLandUseItems(items: LandUseItem[]) {
  appState.update((s) => {
    let totalPct = 0;
    let weightedCn = 0;
    for (const item of items) {
      totalPct += item.percentage;
      weightedCn += getCn(item.categoryId, item.hsg) * item.percentage;
    }
    const newCn = totalPct > 0 ? weightedCn / totalPct : 0;
    // If total percentage is not 100, we might want to warn or handle it, 
    // but for now we just normalize to the covered area or if empty, keep 0.
    // Actually, if items are empty, we might want to keep the manual CN?
    // Let's say if items are present, they override manual CN.
    return { ...s, landUseItems: items, cn: items.length > 0 ? Math.round(newCn) : s.cn };
  });
}

function setLat(lat: number) {
  if (!Number.isFinite(lat)) return;
  appState.update((s) => ({ ...s, lat }));
}

function setLon(lon: number) {
  if (!Number.isFinite(lon)) return;
  appState.update((s) => ({ ...s, lon }));
}

function setLatLon(lat: number, lon: number) {
  appState.update((s) => ({ ...s, lat, lon }));
}

function selectDuration(duration: string) {
  appState.update((s) => selectDurationAndAri(s, duration, s.selectedAri));
}

function selectAri(ari: string) {
  appState.update((s) => selectDurationAndAri(s, s.selectedDuration, ari));
}

function exportSwmm() {
  const state = get(appState);
  if (!state.areaAc) return;
  let pctImperv = ((state.cn - 30) / 70) * 100;
  pctImperv = Math.min(99, Math.max(0, pctImperv));
  const sub: SwmmSubcatchment = {
    name: "S1",
    areaAc: state.areaAc,
    pctImperv,
    width: Math.sqrt(state.areaAc) * 100,
    slope: 0.02,
    outlet: "Out1",
    cn: state.cn
  };
  saveSwmmInp(sub, "watershed.inp");
}

function addScenario() {
  appState.update((s) => {
    if (!s.delineated || !s.rainfallDepth) return s;
    const scenario: SavedScenario = {
      id: crypto.randomUUID(),
      label: `${s.selectedAri}-yr / ${s.selectedDuration}`,
      lat: s.lat,
      lon: s.lon,
      cn: s.cn,
      rainfallDepth: s.rainfallDepth,
      ari: s.selectedAri,
      duration: s.selectedDuration,
      landUseItems: s.landUseItems
    };
    return { ...s, savedScenarios: [scenario, ...s.savedScenarios] };
  });
}

function loadScenario(scenario: SavedScenario) {
  appState.update((s) => ({
    ...s,
    lat: scenario.lat,
    lon: scenario.lon,
    cn: scenario.cn,
    rainfallDepth: scenario.rainfallDepth,
    selectedAri: scenario.ari,
    selectedDuration: scenario.duration,
    landUseItems: scenario.landUseItems,
    // We need to re-trigger calculations or at least set the state to look like it's calculated
    // Ideally we would re-run the whole flow, but for now let's just set the values we have
    // and maybe trigger a re-calc if possible.
    // Actually, let's just set the inputs and let the user hit "Compute" or we can try to re-compute.
    // Re-computing requires the rainfall table which might not be loaded if we just refreshed.
    // So let's just restore the inputs.
    delineated: true, // Assume delineated if we have a scenario? Or maybe we need to re-delineate?
    // If we don't have the watershed geometry, we can't really say it's delineated fully for the map.
    // But we can restore the numerical inputs.
    // For a better UX, we might want to store the watershed geometry in the scenario too, but that might be big.
    // Let's stick to inputs for now.
  }));
  // Trigger rainfall fetch if needed, or just let the user guide it.
  // For now, let's just set the values.
}

function deleteScenario(id: string) {
  appState.update((s) => ({
    ...s,
    savedScenarios: s.savedScenarios.filter((sc) => sc.id !== id)
  }));
}

async function checkApiHealth() {
  appState.update((s) => ({ ...s, apiHealth: "checking" }));
  const status = await fetchApiHealth();
  appState.update((s) => ({ ...s, apiHealth: status }));
}

async function fetchLandUseData() {
  appState.update((s) => ({ ...s, isFetchingLandUse: true }));
  try {
    const { watershed } = get(appState);
    if (!watershed) throw new Error("No watershed delineated");

    const items = await fetchLandUse(watershed);
    updateLandUseItems(items);
    appState.update((s) => ({ ...s, isFetchingLandUse: false }));
  } catch (ex) {
    const message = (ex as Error).message;
    appState.update((s) => ({ ...s, isFetchingLandUse: false, error: message }));
  }
}

export const actions = {
  delineate,
  fetchRainfall,
  computeRunoffValues,
  selectDuration,
  selectAri,
  updateCurveNumber,
  updateLandUseItems,
  setLat,
  setLon,
  setLatLon,
  exportSwmm,
  addScenario,
  checkApiHealth,
  fetchLandUseData,
  loadScenario,
  deleteScenario
};
