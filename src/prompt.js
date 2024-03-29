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
 * | {command: string}
 * )} Input */

/** @typedef {(
 * | {title: string}
 * | {value: string}
 * | {help: string|Iterable<string>}
 * | {error: string}
 * | {command: string, label?: string}
 * )} Output */

/** @typedef {(...args: string[]) => Iterable<Output>} Command */

/**
 * @template T
 * @param {() => HTMLElement} makeEl
 * @param {Interactor<T>} tor
 */
export async function runPrompt(makeEl, tor) {
  const $el = makeEl();
  try {
    return await prompt($el, tor);
  } finally {
    $el.parentNode?.removeChild($el);
  }
}

/** @template T
 * @param {HTMLElement} $body
 * @param {Interactor<T>} tor
 * @returns {Promise<T|undefined>}
 */
export async function prompt($body, tor) {
  /** @typedef {(
   * | {value: string}
   * | {command: string}
   * | {canceled: true}
   * )} Response */

  const handleEvents = ['click', 'keydown', 'keyup'];

  /** @type {((res: Response) => void)} */
  let callback = () => { };

  function makeHeader() {
    let $header = mayQuery($body, 'h1', HTMLHeadingElement);
    if (!$header) {
      $header = $body.insertBefore(
        $body.ownerDocument.createElement('h1'),
        $body.firstElementChild);
    }
    return $header;
  }

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
      $help = $body.appendChild(
        $body.ownerDocument.createElement('div'));
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

  /**
   * @param {object} options
   * @param {string} options.id
   * @param {string} options.label
   * @param {string} [options.title]
   */
  function makeButton({ id, label, title }) {
    let $btn = mayQuery($body, `button[id="${id}"]`, HTMLButtonElement);
    if (!$btn) {
      $btn = $body.appendChild(
        $body.ownerDocument.createElement('button'));
      $btn.id = id;
    }
    $btn.innerText = label;
    $btn.title = title || '';
    return $btn;
  }

  function resetOutputElements() {
    const $header = mayQuery($body, 'h1', HTMLHeadingElement);
    if ($header) {
      $header.style.display = 'none';
      $header.innerText = '';
    }

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

      case 'click':
        {
          const { target } = e;
          if (target && target instanceof HTMLButtonElement) {
            const { command } = target.dataset;
            if (command) {
              e.preventDefault();
              callback({ command });
            }
          }
        }
        break;

      case 'keydown':
        if (e instanceof KeyboardEvent) {
          switch (e.key) {

            case 'Enter':
              const $text = mayQuery($body, '#text', HTMLTextAreaElement);
              if ($text && e.target === $text) {
                if (e.ctrlKey) {
                  e.preventDefault();
                }
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
              const $text = mayQuery($body, '#text', HTMLTextAreaElement);
              if ($text && e.target === $text) {
                if (Date.now() - lastEnter < 1000 || e.ctrlKey) {
                  e.preventDefault();
                  callback({ value: $text ? $text.value.replace(/(?:\r?\n)+$/, '') : '' });
                  return;
                }
                lastEnter = Date.now();
              }
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
    for (const event of handleEvents)
      $body.addEventListener(event, handleEvent);

    /** @type {Input[]} */
    let inputs = [];
    for (; ;) {

      { // tick tor
        const { done, value } = tor.next(inputs);
        if (done) { return value }
        const outputs = value;

        resetOutputElements();

        /** @type {WeakSet<HTMLButtonElement>} */
        const activeButtons = new WeakSet();

        for (const output of outputs) {
          if ('title' in output) {
            const { title } = output;
            const $header = makeHeader();
            $header.innerText = title;
            $header.style.display = '';
          }

          else if ('value' in output) {
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
              $help.innerText += typeof help == 'string' ? terminate(help) : coalesce(help);
              $help.style.display = '';
            }
          }

          else if ('command' in output) {
            const { command, label = command } = output;
            const id = `${$body.id}$${command}`;
            const $btn = makeButton({ id, label });
            $btn.dataset['command'] = command;
            activeButtons.add($btn);
          }

          else assertNever(output, 'unimplemented');
        }

        for (const $btn of $body.querySelectorAll('button')) {
          if (!activeButtons.has($btn)) {
            $body.removeChild($btn);
          }
        }
      }

      { // wait for user
        inputs = [];
        const res = await /** @type {Promise<Response>} */ (
          new Promise(resolve => callback = resolve));
        callback = () => { };
        if ('canceled' in res) { throw _canceled }
        else inputs.push(res);
      }
    }
  } catch (e) {
    if (e !== _canceled) throw e;
    return undefined;
  } finally {
    for (const event of handleEvents)
      $body.removeEventListener(event, handleEvent);
    $body.style.display = 'none';
    while ($body.lastChild) $body.removeChild($body.lastChild);
  }
}

/** @param {Iterable<string>} strs */
function coalesce(strs, sep = '\n') {
  let out = '';
  for (const str of strs) {
    out += terminate(str, sep);
  }
  return out;
}

/** @param {string} str */
function terminate(str, end = '\n') {
  return str.endsWith(end) ? str : `${str}${end}`;
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
