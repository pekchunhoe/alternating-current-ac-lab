/** Format a number as mathematics, including genuine powers of ten in KaTeX. */
export function texNumber(value: number, significantFigures = 5) {
  if (!Number.isFinite(value)) throw new RangeError('Only finite values can be typeset.');
  if (Math.abs(value) < 1e-14) return '0';
  const text = Number(value.toPrecision(significantFigures)).toString();
  const [mantissa, exponent] = text.split('e');
  return exponent === undefined ? mantissa : String.raw`${mantissa}\times10^{${Number(exponent)}}`;
}
