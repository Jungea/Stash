import { createRequire } from "module";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const require = createRequire(import.meta.url);
const { Jimp } = require("jimp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

const BG = 0x0a0a0aff;
const FG = 0xffffffff;

// 5x7 비트맵으로 'S' 표현
const bitmap = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

async function makeIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG });

  const scale = Math.floor(size / 10);
  const totalW = bitmap[0].length * scale;
  const totalH = bitmap.length * scale;
  const offsetX = Math.floor((size - totalW) / 2);
  const offsetY = Math.floor((size - totalH) / 2);

  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      if (bitmap[row][col]) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            img.setPixelColor(FG, offsetX + col * scale + dx, offsetY + row * scale + dy);
          }
        }
      }
    }
  }

  const path = join(outDir, `icon-${size}.png`);
  await img.write(path);
  console.log(`생성됨: ${path}`);
}

await makeIcon(192);
await makeIcon(512);
