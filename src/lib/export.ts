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
  lines.push('');
  lines.push('[SUBCATCHMENTS]');
  lines.push(';;Name	Rain Gage	Outlet	Area	%Imperv	Width	Slope	CurbLen	SnowPack');
  lines.push(`${sub.name}\tRG1\t${sub.outlet}\t${sub.areaAc.toFixed(3)}\t${sub.pctImperv.toFixed(1)}\t${sub.width.toFixed(1)}\t${sub.slope.toFixed(3)}\t0\t`);
  lines.push('');
  lines.push('[RAINGAGES]');
  lines.push(';;Name	Format	Interval	SCF	Source');
  lines.push('RG1	VOLUME	5:00	1.0	0');
  lines.push('');
  lines.push('[SUBAREAS]');
  lines.push(';;Subcatchment	N-Imperv	N-Perv	%Zero-Imperv	Route-To	PctRouted');
  lines.push(`${sub.name}\t0.05\t0.20\t25\t*\t0`);
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