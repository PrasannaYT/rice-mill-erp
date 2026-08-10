import Decimal from "decimal.js";

/**
 * Normalizes paddy weight based on moisture content.
 * Formula: Wf = Wi × (100 - MCi) / (100 - MCf)
 * 
 * @param netWeight Initial net weight of the paddy (Wi)
 * @param initialMoisture Moisture percentage at time of weighing (MCi)
 * @param targetMoisture Standard safe milling moisture percentage (MCf), typically 14%
 * @returns The normalized weight (Wf)
 */
export function calculateNormalizedWeight(
  netWeight: number | string | Decimal,
  initialMoisture: number | string | Decimal,
  targetMoisture: number | string | Decimal = 14.0
): Decimal {
  const Wi = new Decimal(netWeight);
  const MCi = new Decimal(initialMoisture);
  const MCf = new Decimal(targetMoisture);

  // If initial moisture is less than or equal to target, no deduction is strictly necessary 
  // according to some business rules, but mathematically we apply the formula.
  // We'll apply the formula directly.
  
  const numerator = new Decimal(100).minus(MCi);
  const denominator = new Decimal(100).minus(MCf);
  
  if (denominator.isZero()) {
    throw new Error("Target moisture cannot be 100%");
  }

  const Wf = Wi.times(numerator).dividedBy(denominator);
  
  // Return rounded to 4 decimal places for high precision database storage
  return Wf.toDecimalPlaces(4);
}
