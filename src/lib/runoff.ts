/**
 * Hydrologic computation utilities.  These functions implement simple
 * NRCS curve number and rational method calculations to estimate runoff
 * depth, volume and peak discharge.  They are deliberately light‑weight
 * and do not attempt to model routing or timing effects; for that one
 * should couple this application with SWMM or ICM.
 */

export interface RunoffResult {
  /** Runoff depth in inches. */
  runoffDepthIn: number;
  /** Runoff volume in acre‑feet. */
  runoffVolumeAcFt: number;
  /** Runoff coefficient used in rational formula (dimensionless). */
  runoffCoefficient: number;
}

/**
 * Compute runoff depth (in inches) from precipitation depth (in inches)
 * using the NRCS curve number method.  The curve number (CN) should be
 * between 30 (very permeable soils/low runoff) and 100 (impervious).  If
 * rainfall depth is less than the initial abstraction there is no runoff.
 *
 * @param p Rainfall depth in inches
 * @param cn Curve number (dimensionless, typically 30–100)
 */
export function computeRunoffDepthCN(p: number, cn: number): number {
  if (cn <= 0 || cn >= 100 || !Number.isFinite(p)) return 0;
  const S = (1000 / cn) - 10; // potential maximum retention (in)
  const Ia = 0.2 * S; // initial abstraction (in)
  if (p <= Ia) return 0;
  return ((p - Ia) * (p - Ia)) / (p - Ia + S);
}

/**
 * Compute runoff volume in acre‑feet given area and runoff depth.
 *
 * @param areaAc Area in acres
 * @param runoffDepthIn Runoff depth in inches
 */
export function computeRunoffVolume(areaAc: number, runoffDepthIn: number): number {
  // Convert runoff depth from inches to feet, multiply by area (acres).
  const runoffDepthFt = runoffDepthIn / 12;
  return areaAc * runoffDepthFt;
}

/**
 * Compute the rational peak discharge (Q = C i A).  Intensity i should be
 * in inches per hour, area in acres.  The returned flow rate is in cubic
 * feet per second.  A conversion factor of 1.008 is applied (1 acre =
 * 43560 ft²; 1 in = 1/12 ft) so that Q = C · i · A · 1.008.
 *
 * @param intensityInHr Rainfall intensity in inches per hour
 * @param coefficient Runoff coefficient (dimensionless)
 * @param areaAc Area in acres
 */
export function computeRationalPeak(intensityInHr: number, coefficient: number, areaAc: number): number {
  if (!Number.isFinite(intensityInHr) || !Number.isFinite(coefficient) || !Number.isFinite(areaAc)) return 0;
  return intensityInHr * coefficient * areaAc * 1.008;
}

/**
 * Perform a complete runoff computation given rainfall depth and optional
 * intensity.  If intensity is not provided the rational peak will not be
 * computed (returns 0).  The runoff coefficient is derived from the
 * computed runoff depth relative to precipitation depth.
 */
export function computeRunoff(
  pDepthIn: number,
  intensityInHr: number | null,
  cn: number,
  areaAc: number
): RunoffResult {
  const runoffDepth = computeRunoffDepthCN(pDepthIn, cn);
  const volume = computeRunoffVolume(areaAc, runoffDepth);
  const coeff = pDepthIn > 0 ? runoffDepth / pDepthIn : 0;
  const peak = intensityInHr != null ? computeRationalPeak(intensityInHr, coeff, areaAc) : 0;
  return {
    runoffDepthIn: runoffDepth,
    runoffVolumeAcFt: volume,
    runoffCoefficient: coeff
  };
}