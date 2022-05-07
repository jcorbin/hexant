// @ts-check

'use strict';

/**
 * @template {abstract new(...args: any[]) => any} T
 * @param {HTMLElement} el
 * @param {string} selector
 * @param {T} type
 * @returns {InstanceType<T>}
 */
export function mustQuery(el, selector, type) {
  const res = el.querySelector(selector);
  if (!res) {
    throw new Error(`unable to find a ${selector}`);
  }
  if (!(res instanceof type)) {
    throw new Error(`invalid ${selector} element, must be a ${type.name} instance`);
  }
  return /** @type {InstanceType<T>} */ (res);
}

