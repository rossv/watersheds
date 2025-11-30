<script lang="ts">
    import { onMount } from "svelte";
    import Plotly from "plotly.js-dist-min";

    export let peakFlow: number; // cfs
    export let duration: number; // hours (storm duration)

    let plotDiv: HTMLDivElement;

    // Simple triangular hydrograph approximation
    // Rise time = 0.375 * duration (approx)
    // Base time = 2.67 * Rise time (approx for SCS)
    // This is a very rough approximation for visualization purposes
    $: timePoints = [0, duration * 0.375, duration * 1.5]; // hours
    $: flowPoints = [0, peakFlow, 0]; // cfs

    $: if (plotDiv && peakFlow > 0) {
        drawGraph();
    }

    function drawGraph() {
        const trace = {
            x: timePoints,
            y: flowPoints,
            type: "scatter",
            mode: "lines+markers",
            fill: "tozeroy",
            line: { color: "#2563eb", shape: "spline" },
            name: "Hydrograph",
        };

        const layout = {
            title: { text: "Unit Hydrograph Proxy", font: { size: 14 } },
            margin: { t: 30, r: 10, b: 30, l: 40 },
            height: 200,
            xaxis: { title: "Time (hr)", showgrid: true },
            yaxis: { title: "Flow (cfs)", showgrid: true },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { family: "Inter, sans-serif" },
        };

        const config = { responsive: true, displayModeBar: false };

        Plotly.newPlot(plotDiv, [trace], layout, config);
    }

    onMount(() => {
        if (peakFlow > 0) {
            drawGraph();
        }
    });
</script>

<div class="hydrograph-container">
    <div bind:this={plotDiv}></div>
</div>

<style>
    .hydrograph-container {
        width: 100%;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
        background: var(--bg-card);
    }
</style>
