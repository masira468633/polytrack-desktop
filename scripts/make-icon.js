'use strict';

/**
 * Generates build/icon.png (512x512) from the game's SVG icon.
 * electron-builder converts that PNG into the Windows .ico automatically.
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const gameIcon = path.join(__dirname, '..', 'game', 'images', 'icon.svg');
const output = path.join(__dirname, '..', 'build', 'icon.png');

fs.mkdirSync(path.dirname(output), { recursive: true });

sharp(gameIcon, { density: 1024 })
  .resize(512, 512, { fit: 'contain', background: { r: 40, g: 52, b: 106, alpha: 1 } })
  .png()
  .toFile(output)
  .then(() => console.log(`Icon written to ${output}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
