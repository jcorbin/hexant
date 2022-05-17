// @ts-check

import { mustQuery } from './domkit.js';

/** @template T
 * @typedef {Generator<Output[], T, Input[]>} Interactor
 */

/** @template T
 * @typedef {(inputs: Input[]) => Generator<Output, T|undefined>} Looper
 */

/** @typedef {(
 * | {value: string}
 * )} Input */

/** @typedef {(
 * | {value: string}
 * | {help: string}
 * | {error: string}
 * )} Output */

/** @template T
 * @param {HTMLElement} $body
 * @param {Interactor<T>} tor
 * @returns {Promise<T|undefined>}
 */
export async function prompt($body, tor) {
  const
    $help = mustQuery($body, '#help', HTMLElement),
    $text = mustQuery($body, '#text', HTMLTextAreaElement),
    $error = mustQuery($body, '#error', HTMLElement);

  /** @typedef {(
   * | {value: string}
   * | {canceled: true}
   * )} Response */

  /** @type {((res: Response) => void)} */
  let callback = () => { };

  const respond = () => callback({ value: $text.value.replace(/(?:\r?\n)+$/, '') });
  const cancel = () => callback({ canceled: true });

  function hide() {
    $body.style.display = 'none';
    $help.innerText = '';
    $text.value = '';
    $error.style.display = 'none';
    $error.innerText = '';
  }

  function resizeTextRows() {
    const lines = $text.value.split(/\n/);
    $text.rows = lines.length + 1;
  }

  let lastEnter = 0;

  /** @param {Event} e */
  function handleEvent(e) {
    switch (e.type) {

      case 'keydown':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {

            case 'Enter':
              if (e.ctrlKey) {
                e.preventDefault();
              }
              break;

            case 'Escape':
              cancel();
              e.preventDefault();
              return;

          }
          resizeTextRows();
        }
        break;

      case 'keyup':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {

            case 'Enter':
              if (Date.now() - lastEnter < 1000 || e.ctrlKey) {
                e.preventDefault();
                respond();
                return;
              }
              lastEnter = Date.now();
              break;

            default:
              lastEnter = 0;

          }
          resizeTextRows();
        }
        break;

    }
  }

  const _canceled = new Object();
  try {

    $body.style.display = '';

    $text.addEventListener('keydown', handleEvent);
    $text.addEventListener('keyup', handleEvent);

    /** @type {Input[]} */
    let inputs = [];
    for (; ;) {

      { // tick tor
        const { done, value } = tor.next(inputs);
        inputs = [];
        if (done) { return value }
        for (const output of value) {

          if ('value' in output) {
            const { value } = output;
            $text.value = value;
            resizeTextRows();
            $text.select();
            $text.focus();
          }

          else if ('error' in output) {
            const { error } = output;
            $error.innerText = error;
            $error.style.display = error ? '' : 'none';
          }

          else if ('help' in output) {
            const { help } = output;
            $help.innerText = help;
            $help.style.display = help ? '' : 'none';
          }

          else assertNever(output, 'unimplemented');
        }
      }

      { // wait for user
        const res = await /** @type {Promise<Response>} */ (
          new Promise(resolve => callback = resolve));
        callback = () => { };
        if ('canceled' in res) { throw _canceled }
        inputs.push(res);
      }
    }
  } catch (e) {
    if (e !== _canceled) throw e;
    return undefined;
  } finally {
    hide();
  }
}

/** @template T
 * @param {Looper<T>[]} loopers
 * @returns {Interactor<T>}
 */
export function loop(...loopers) {
  const body = firstLooper(...loopers);
  return function*() {
    let { values: outputs, value } = collectIt(body([]));
    while (value === undefined) {
      const inputs = yield outputs;
      ({ values: outputs, value } = collectIt(body(inputs)));
    }
    return value;
  }();
}

/** @template T
 * @param {Looper<T>[]} loopers
 * @returns {Looper<T>}
 */
function firstLooper(...loopers) {
  switch (loopers.length) {
    case 0:
      return function*() { return undefined };
    case 1:
      return loopers[0];
  }
  return function*(inputs) {
    for (const looper of loopers) {
      const gen = looper(inputs);
      const { done, value: first } = gen.next();

      // looper produces output, so the rest don't get a shot this round
      if (!done) {
        yield first;
        return yield* gen;
      }

      // looper returned a final result, we'll take it!
      if (first !== undefined) {
        return first;
      }
    }

    // we'll have to do this all again with a different batch of inputs
    return undefined;
  };
}

/** @template V, R
 * @param {Iterator<V, R>} it
 */
function collectIt(it) {
  /** @type {V[]} */
  const values = [];
  for (; ;) {
    const { done, value } = it.next();
    if (done) { return { values, value } }
    values.push(value);
  }
}

/**
 * @param {never} impossible
 * @param {string} mess
 */
function assertNever(impossible, mess) {
  throw new Error(`${mess}: ${JSON.stringify(impossible)}`);
}
