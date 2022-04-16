// @ts-check

import * as rezult from './rezult.js';

/** @param {Window} window */
export default function makeHash(window) {
  const codecs = makeCodecSuite();

  codecs.addCodec('', {
    encodeKeys(keyvals) {
      const parts = [];
      for (const [key, val] of keyvals) {
        let part = encodeURIComponent(key);
        if (val !== undefined && val !== '') {
          part += '=' + encodeURIComponent(val);
        }
        parts.push(part);
      }
      return parts.join('&');
    },
    *decodeKeys(str) {
      for (const part of str.split('&')) {
        let [key, val] = part.split('=');
        key = decodeURIComponent(key || '');
        val = decodeURIComponent(val || '');
        if (key) {
          yield [key, val];
        }
      }
    },
  });

  codecs.addCodec('b64:', {
    encode: btoa,
    decode: atob,
    // TODO direct key codec is possible, no need to url-escape under base64
  });

  /** @type {Map<string, string>} */
  const cache = new Map();

  /** @type {Map<string, any>} */
  const values = new Map();

  /** @type {Map<string, any>} */
  const defaults = new Map();

  /** @type {Map<string, (s: string) => rezult.Result<any>>} */
  const parsers = new Map();

  /** @type {Map<string, (val: any) => (string|undefined)>} */
  const stringers = new Map();

  /** @type {Map<string, Array<(val: any) => void>>} */
  const listeners = new Map();

  let last = '';
  let loaded = false;

  window.addEventListener('hashchange', () => reload());

  function reload(hash = window.location.hash) {
    if (loaded && hash !== last) {
      load(hash);
    }
  }

  function load(hash = window.location.hash) {
    const resave = loadValues(hash);
    last = hash;
    if (resave) {
      save();
    }
  }

  function save() {
    let hash = codecs.encode(cache.entries());
    if (hash) {
      hash = '#' + hash;
    }
    if (hash !== last) {
      last = hash;
      window.location.hash = hash;
    }
  }

  /** @param {string} hash */
  function loadValues(hash) {
    let resave = false;
    /** @type Set<string> */
    const seen = new Set();
    /** @type {{key: string, value: any}[]} */
    const toNotify = [];

    for (const [key, str] of codecs.decode(hash.slice(1))) {
      seen.add(key);
      if (cache.get(key) !== str) {
        cache.set(key, str);
        toNotify.push({ key, value: loadBinding(key) });
      }
    }

    for (const [key, value] of defaults.entries()) {
      if (!seen.has(key)) {
        seen.add(key);
        if (values.get(key) !== value) {
          if (value === undefined) {
            values.delete(key);
            cache.delete(key);
          } else {
            values.set(key, value);
            const stringer = stringers.get(key) || valueToString;
            const str = stringer(value);
            if (str !== undefined) {
              cache.set(key, str);
            } else {
              cache.delete(key);
            }
          }
          toNotify.push({ key, value });
          resave = true;
        }
      }
    }

    for (const key of cache.keys()) {
      if (!seen.has(key)) {
        seen.add(key);
        cache.delete(key);
        values.delete(key);
        toNotify.push({ key, value: defaults.get(key) });
        resave = true;
      }
    }

    for (const { key, value } of toNotify) {
      notifyBinding(key, value);
    }

    loaded = true;
    return resave;
  }

  /** @param {string} key */
  function loadBinding(key) {
    const str = cache.get(key);
    if (str === undefined) {
      return defaults.get(key);
    }

    const parser = parsers.get(key) || parseValue;

    let { err, value } = parser(str);
    if (err) {
      // intentionally ignore parse error; best-effort load
      return;
    }

    if (values.get(key) !== value) {
      if (value === undefined) {
        values.delete(key);
      } else {
        values.set(key, value);
      }
    }

    if (value === undefined) {
      return defaults.get(key);
    }

    return value;
  }

  /** @param {string} key */
  function saveBinding(key, value = values.get(key)) {
    const stringer = stringers.get(key) || valueToString;
    const str = stringer(value);
    if (cache.get(key) !== str) {
      if (str === undefined) {
        cache.delete(key);
      } else {
        cache.set(key, str);
      }
      save();
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   */
  function notifyBinding(key, value) {
    for (const fn of listeners.get(key) || []) {
      fn(value);
    }
  }

  /**
   * @param {string} key
   * @param {any} val
   */
  function parseBindingValue(key, val) {
    if ((val === null || val === undefined) && defaults.has(key)) {
      val = defaults.get(key);
    }
    let res = rezult.just(val);
    /** @type {string|undefined} */
    let str = '';
    if (typeof val === 'string') {
      const parser = parsers.get(key) || parseValue;
      res = parser(val), str = val;
    } else {
      const stringer = stringers.get(key) || valueToString;
      str = stringer(val);
    }
    return { res, str };
  }

  /**
   * @param {any} val
   * @returns {string|undefined}
   */
  function valueToString(val) {
    if (val === false) {
      return undefined;
    }
    if (val === true) {
      return '';
    }
    return '' + val;
  }

  /**
   * @param {string} str
   * @returns {rezult.Result<any>}
   */
  function parseValue(str) {
    if (str === '' || str === 'true') {
      return rezult.just(true);
    }
    if (str === 'false') {
      return rezult.just(false);
    }
    if (str === 'null') {
      return rezult.just(null);
    }
    return rezult.just(str);
  }

  return {
    get encoding() {
      return codecs.defaultEncoding;
    },
    set encoding(enc) {
      codecs.defaultEncoding = enc;
      save();
    },

    /** @template T
     * @param {string} key
     * @param {object} params
     * @param {T} params.defaultValue
     * @param {(val: T) => void} params.listener
     * @param {(str: string) => rezult.Result<T>} [params.parse]
     * @param {(val: T) => string|undefined} [params.stringer]
     */
    bind(key, {
      parse = parseValue,
      stringer = valueToString,
      listener,
      defaultValue,
    }) {
      if (typeof defaultValue === 'string') {
        defaultValue = rezult.toValue(parse(defaultValue));
      }
      parsers.set(key, parse);
      stringers.set(key, stringer);
      defaults.set(key, defaultValue);
      if (listener) {
        listeners.set(key, [listener]);
      } else {
        listeners.delete(key);
      }

      if (loaded) {
        const value = loadBinding(key);
        saveBinding(key, value);
        notifyBinding(key, value);
      }
    },

    load,

    /** @param {string} key */
    getStr(key) {
      const prior = cache.get(key);
      if (prior !== undefined) {
        return prior;
      }

      const defaultValue = defaults.get(key);
      if (defaultValue !== undefined && typeof defaultValue !== 'string') {
        const stringer = stringers.get(key) || valueToString;
        const defaultString = stringer(defaultValue);
        if (defaultString !== undefined) {
          return defaultString;
        }
      }

      return '';
    },

    /** @param {string} key */
    get(key) {
      return values.get(key);
    },

    /**
     * @param {string} key
     * @param {any} val
     */
    set(key, val) {
      const r = parseBindingValue(key, val);
      const { res: { err, value } } = r;
      if (!err && values.get(key) !== value) {
        values.set(key, value);
        saveBinding(key, value);
        notifyBinding(key, value);
      }
      return r;
    },

    [Symbol.iterator]() {
      return values.entries();
    },

    stringEntries() {
      return cache.entries();
    },

  };
}

function makeCodecSuite() {

  /** @type {string[]} */
  let defaultEncoding = [];

  /** @type {Map<string, (s: string) => string>} */
  const encoders = new Map();

  /** @type {Map<string, (s: string) => string>} */
  const decoders = new Map();

  /** @type {Map<string, (keyvals: Iterable<[key: string, val: string]>) => string>} */
  const keyEncoders = new Map();

  /** @type {Map<string, (s: string) => IterableIterator<[key: string, val: string]>>} */
  const keyDecoders = new Map();

  /**
   * @param {Iterable<[key: string, val: string]>} keyvals
   * @returns {string}
   */
  function encode(keyvals) {
    let encoded = '';

    let i = 0;

    // if the first encoder can directly handle keys, let it; otherwise,
    // fallback to a base key encoder, and proceed to the wrapping phase
    const firstKey = defaultEncoding[i];
    let firstEnc = firstKey && keyEncoders.get(firstKey);
    if (firstEnc) {
      encoded = firstKey + firstEnc(keyvals);
      i++;
    } else {
      firstEnc = keyEncoders.get('');
      if (!firstEnc) {
        throw new Error('no default keyEncoder available!');
      }
      encoded = firstEnc(keyvals);
    }

    // apply any number of wrapped string encodings
    for (; i < defaultEncoding.length; i++) {
      const key = defaultEncoding[i];
      const enc = key && encoders.get(key);
      if (enc) {
        encoded = key + enc(encoded);
      } else {
        break;
      }
    }

    return encoded;
  }

  /**
   * @param {string} str
   * @returns {IterableIterator<[key: string, val: string]>}
   */
  function decode(str) {
    const orig = str;
    round: for (let sanity = 100; sanity-- > 0;) {
      // prefer to decode directly into final keyvals when possible
      for (const [key, decoder] of keyDecoders) {
        if (str.startsWith(key)) {
          return decoder(str.slice(key.length));
        }
      }
      // intermediate string encoding
      for (const [key, decoder] of decoders) {
        if (str.startsWith(key)) {
          str = decoder(str.slice(key.length));
          continue round;
        }
      }
      // exhausted all possible decoders, unable to progress
      break;
    }
    if (str === orig) {
      throw new Error(`unable to decode: ${JSON.stringify(str)}`);
    } else {
      throw new Error(`unable to decode: ${JSON.stringify(str)}, original form: ${JSON.stringify(orig)}`);
    }
  }

  /**
   * @param {string} key
   * @param {object} codec
   * @param {(s: string) => string} [codec.encode]
   * @param {(s: string) => string} [codec.decode]
   * @param {(keyvals: Iterable<[key: string, val: string]>) => string} [codec.encodeKeys]
   * @param {(s: string) => IterableIterator<[key: string, val: string]>} [codec.decodeKeys]
   */
  function addCodec(key, { encode, decode, encodeKeys, decodeKeys }) {
    if (encode) {
      encoders.set(key, encode);
    }
    if (decode) {
      decoders.set(key, decode);
    }
    if (encodeKeys) {
      keyEncoders.set(key, encodeKeys);
    }
    if (decodeKeys) {
      keyDecoders.set(key, decodeKeys);
    }
  }

  return {
    get defaultEncoding() {
      switch (defaultEncoding.length) {
        case 0:
          return '';
        case 1:
          return defaultEncoding[0] || '';
        default:
          return defaultEncoding.join('');
      }
    },
    set defaultEncoding(enc) {
      const encs = [];
      let rem = enc;
      parse: while (rem.length) {
        for (const key of encoders.keys()) {
          if (rem.startsWith(key)) {
            encs.push(key);
            rem = rem.slice(key.length);
            continue parse;
          }
        }
        throw new Error(`invalid encoding ${JSON.stringify(rem)} in ${JSON.stringify(enc)}`);
      }
      defaultEncoding = encs;
    },

    addCodec,

    encode,
    decode,
  };
}
