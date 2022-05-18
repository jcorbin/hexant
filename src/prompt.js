// @ts-check

import { mayQuery } from './domkit.js';

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
  /** @typedef {(
   * | {value: string}
   * | {canceled: true}
   * )} Response */

  /** @type {((res: Response) => void)} */
  let callback = () => { };

  function makeText() {
    let $text = mayQuery($body, '#text', HTMLTextAreaElement);
    if (!$text) {
      $text = $body.appendChild(
        $body.ownerDocument.createElement('textarea'));
      $text.id = 'text';
    }
    return $text;
  }

  function makeHelp() {
    let $help = mayQuery($body, '#help', HTMLElement);
    if (!$help) {
      $help = $body.insertBefore(
        $body.ownerDocument.createElement('div'),
        makeText());
      $help.id = 'help';
      $help.classList.add('help');
    }
    return $help;
  }

  function makeError() {
    let $error = mayQuery($body, '#error', HTMLElement);
    if (!$error) {
      $error = $body.appendChild(
        $body.ownerDocument.createElement('div'));
      $error.id = 'error';
      $error.classList.add('error');
    }
    return $error;
  }

  function resetOutputElements() {
    const $text = mayQuery($body, '#text', HTMLTextAreaElement);
    if ($text) {
      $text.value = '';
      $text.rows = 1;
    }

    const $help = mayQuery($body, '#help', HTMLElement);
    if ($help) {
      $help.style.display = 'none';
      $help.innerText = '';
    }

    const $error = mayQuery($body, '#error', HTMLElement);
    if ($error) {
      $error.style.display = 'none';
      $error.innerText = '';
    }
  }

  function resizeTextRows() {
    let $text = mayQuery($body, '#text', HTMLTextAreaElement);
    if ($text) {
      const lines = $text.value.split(/\n/);
      $text.rows = lines.length + 1;
    }
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
              e.preventDefault();
              callback({ canceled: true });
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
                const $text = mayQuery($body, '#text', HTMLTextAreaElement);
                callback({ value: $text ? $text.value.replace(/(?:\r?\n)+$/, '') : '' });
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

    {
      const $text = makeText();
      $text.addEventListener('keydown', handleEvent);
      $text.addEventListener('keyup', handleEvent);
    }

    /** @type {Input[]} */
    let inputs = [];
    for (; ;) {

      { // tick tor
        const { done, value } = tor.next(inputs);
        if (done) { return value }
        const outputs = value;

        resetOutputElements();

        for (const output of outputs) {
          if ('value' in output) {
            const { value } = output;
            const $text = makeText();
            $text.value = value;
            resizeTextRows();
            $text.select();
            $text.focus();
          }

          else if ('error' in output) {
            const { error } = output;
            if (error) {
              const $error = makeError();
              $error.innerText = error;
              $error.style.display = '';
            }
          }

          else if ('help' in output) {
            const { help } = output;
            if (help) {
              const $help = makeHelp();
              $help.innerText = help;
              $help.style.display = '';
            }
          }

          else assertNever(output, 'unimplemented');
        }
      }

      { // wait for user
        inputs = [];
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
    const $error = mayQuery($body, '#error', HTMLElement);
    if ($error) { $body.removeChild($error) }

    const $help = mayQuery($body, '#help', HTMLElement);
    if ($help) { $body.removeChild($help) }

    const $text = mayQuery($body, '#text', HTMLTextAreaElement);
    if ($text) {
      $text.value = '';
      $text.rows = 1;
      $text.removeEventListener('keyup', handleEvent);
      $text.removeEventListener('keydown', handleEvent);
    }

    $body.style.display = 'none';
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
