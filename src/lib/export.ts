/**
 * Minimal SWMM export.  Generates a bare‑bones SWMM input (.inp) file
 * containing a single subcatchment and outlet.  The resulting text can
 * be saved via the provided download helper.  For more complex models
 * (multiple subcatchments, channels, LID controls) the export logic
 * should be extended accordingly.
 */

export interface SwmmSubcatchment {
  name: string;
  areaAc: number;
  pctImperv: number;
  width: number;
  slope: number;
  outlet: string;
  cn: number;
}

/**
 * Format a SWMM input file as a plain text string.
 */
export function formatSwmmInp(sub: SwmmSubcatchment): string {
  const lines: string[] = [];
  lines.push('[TITLE]');
  lines.push(';;Project Title');
  lines.push('Watershed Web Export');
  lines.push('');
  lines.push('[OPTIONS]');
  lines.push(';;Option	Value');
  lines.push('FLOW_UNITS	CFS');
  lines.push('INFILTRATION	CURVE_NUMBER');
  lines.push('FLOW_ROUTING	KINWAVE');
  lines.push('LINK_OFFSETS	DEPTH');
  lines.push('START_DATE	01/01/2024');
  lines.push('START_TIME	00:00:00');
  lines.push('REPORT_START_DATE	01/01/2024');
  lines.push('REPORT_START_TIME	00:00:00');
  lines.push('END_DATE	01/02/2024');
  lines.push('END_TIME	00:00:00');
  lines.push('SWEEP_START	01/01');
  lines.push('SWEEP_END	12/31');
  lines.push('DRY_DAYS	0');
  lines.push('REPORT_STEP	00:15:00');
  lines.push('WET_STEP	00:05:00');
  lines.push('DRY_STEP	01:00:00');
  lines.push('ROUTING_STEP	0:00:30');
  lines.push('');
  lines.push('[SUBCATCHMENTS]');
  lines.push(';;Name\tRain Gage\tOutlet\tArea\t%Imperv\tWidth\tSlope\tCurbLen\tSnowPack');
  lines.push(
    `${sub.name}\tRG1\t${sub.outlet}\t${sub.areaAc.toFixed(3)}\t${sub.pctImperv.toFixed(1)}\t${sub.width.toFixed(1)}\t${sub.slope.toFixed(3)}\t0\t0`
  );
  lines.push('');
  lines.push('[SUBAREAS]');
  lines.push(';;Subcatchment\tN-Imperv\tN-Perv\tS-Imperv\tS-Perv\tPctZero\tRouteTo\tPctRouted');
  lines.push(`${sub.name}\t0.01\t0.1\t0.05\t0.05\t25\tOUTLET\t`);
  lines.push('');
  lines.push('[INFILTRATION]');
  lines.push(';;Subcatchment\tCurveNum\tConductivity\tDryTime');
  lines.push(`${sub.name}\t${sub.cn.toFixed(1)}\t0.5\t7`);
  lines.push('');
  lines.push('[OUTFALLS]');
  lines.push(';;Name\tElevation\tType\tStage Data\tGated\tRoute To');
  lines.push(`${sub.outlet}\t0\tFREE\t\tNO\t`);
  lines.push('');
  lines.push('[RAINGAGES]');
  lines.push(';;Name	Format	Interval	SCF	Source');
  lines.push('RG1	VOLUME	5:00	1.0	0');
  return lines.join('\n');
}

/**
 * Trigger a download of the provided text as a file with the given name.
 */
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/**
 * Helper that combines formatting and downloading for convenience.
 */
export function saveSwmmInp(sub: SwmmSubcatchment, filename = 'watershed.inp'): void {
  const txt = formatSwmmInp(sub);
  downloadText(txt, filename);
}