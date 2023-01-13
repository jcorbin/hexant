// @ts-check

import Hexant from './src/hexant.js';
import { mustQuery } from './src/domkit.js';

const hexant = new Hexant({
  $body: mustQuery(document, '#main', HTMLElement),
});

function updateSize() {
  const {
    innerWidth, innerHeight,
    document: {
      documentElement: { clientWidth, clientHeight },
    },
  } = window;
  const width = Math.max(clientWidth, innerWidth || 0);
  const height = Math.max(clientHeight, innerHeight || 0);
  hexant.resize(width, height);
}

window.addEventListener('resize', () => updateSize());
updateSize();
