import sharp from "sharp";

// Hand-drawn cursive S using bezier path
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0a0a0a"/>
  <path
    d="M 345,110
       C 395,55 240,30 175,80
       C 120,120 130,190 185,220
       C 225,242 310,255 355,295
       C 405,345 385,430 305,455
       C 240,475 145,458 125,408"
    stroke="white"
    stroke-width="58"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
</svg>`;

const svgBuffer = Buffer.from(svg);

await sharp(svgBuffer).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svgBuffer).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svgBuffer).resize(32, 32).png().toFile("app/favicon.ico");

console.log("Done!");
