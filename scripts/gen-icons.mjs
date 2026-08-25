import sharp from "sharp";

function makeSvg(size) {
  const r = Math.round(size * 0.219);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
  <text
    x="${size / 2}"
    y="${size * 0.76}"
    font-family="Arial, Liberation Sans, sans-serif"
    font-size="${size * 0.75}"
    font-weight="900"
    text-anchor="middle"
    fill="white"
  >S</text>
</svg>`;
}

await sharp(Buffer.from(makeSvg(512))).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(makeSvg(192))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(makeSvg(32))).png().toFile("app/favicon.ico");

console.log("Done!");
