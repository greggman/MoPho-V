import {hsl} from './css-utils';

const w = 256;
const h = 64;

const canvas = document.createElement('canvas');

canvas.width = w;
canvas.height = h;

const ctx = canvas.getContext('2d');

function hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; ++i) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return hash;
}

export function createImageFromString(str) {
  const hue = (hash(str) & 0xFF) / 0xFF;
  ctx.fillStyle = hsl(hue, 1, 0.4);
  ctx.fillRect(0, 0, w, h);
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hsl(0, 1, 1);
  const m = ctx.measureText(str);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (m.width > w) {
    ctx.scale(w / m.width, 1);
  }
  ctx.fillText(str, 0, 0);
  ctx.restore();

  return canvas.toDataURL();
}
