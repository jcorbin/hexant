// @ts-check

/** @template T
 * @typedef {(
 * | {value: T, err?: never}
 * | {err: Error, value?: never}
 * )} Result */

/**
 * @template T
 * @param {Result<T>} res
 */
export function toValue({ err, value }) {
  if (err) {
    throw err;
  } else {
    return value;
  }
}

/** @template T
 * @param {Result<T>} res
 * @returns {Promise<T>}
 */
export function toPromise({ err, value }) {
  return err
    ? Promise.reject(err)
    : Promise.resolve(value);
}

/**
 * @template T
 * @param {T} value
 * @returns {Result<T>}
 */
export function just(value) {
  return { value };
}

/**
 * @param {Error} err
 * @returns {Result<never>}
 */
export function error(err) {
  return { err };
}

/**
 * @template T
 * @param {() => Result<T>} body
 * @returns {Result<T>}
 */
export function catchErr(body) {
  try {
    return body();
  } catch (err) {
    return error(err instanceof Error ? err : new Error(`${err}`));
  }
}

/**
 * @template T
 * @param {(...args: any[]) => T} func
 * @returns {(...args: any[]) => Result<T>}
 */
export function lift(func) {
  /** @this {any} */
  return function rezultLifted(...args) {
    return catchErr(() => just(func.apply(this, args)));
  };
}

/**
 * @template T, S
 * @param {Result<T>} res
 * @param {(t: T) => Result<S>} next
 * @returns {Result<S>}
 */
export function bind(res, next) {
  return res.err ? res : next(res.value);
}
