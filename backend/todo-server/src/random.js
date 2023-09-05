'use strict';

/**
 * Creates a random integer with the specified precision.
 * @param n {number} The maximum value
 * @param precision {number} A number between 0 and 1
 * @return {number} A number between 0 and `n + precision * n`
 */
export function anIntegerWithPrecision(n, precision) {
  return n + ((Math.random() * 2 - 1) * precision * n);
}
