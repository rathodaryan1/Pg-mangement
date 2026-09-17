const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = path.join(__dirname, '../public/urban-nest-logo.png');
const outputPath = path.join(__dirname, '../public/urban-nest-logo.png');
const assetPath = path.join(__dirname, '../src/assets/urban-nest-logo.png');

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    const width = this.width;
    const height = this.height;
    console.log(`Original Dimensions: ${width}x${height}`);

    // Pass 1: Make white/near-white pixels transparent with smooth alpha feathering
    // Note: The emblem itself has dark green (#0B4036) and gold (#C8A45D) and charcoal (#18231F), and window panes are #0B4036 / gold
    // Only the outer background canvas is white
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];
        const a = this.data[idx + 3];

        if (r > 240 && g > 240 && b > 240) {
          // White background
          const diff = 255 - Math.min(r, g, b);
          if (r > 248 && g > 248 && b > 248) {
            this.data[idx + 3] = 0;
          } else {
            const alphaFactor = diff / 15;
            this.data[idx + 3] = Math.min(255, Math.round(a * Math.max(0, alphaFactor)));
          }
        }
      }
    }

    // Pass 2: Find bounding box of non-transparent content to trim excess margins
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const alpha = this.data[idx + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add slight 10px padding
    const pad = 10;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;
    console.log(`Cropped Bounding Box: [${minX}, ${minY}] to [${maxX}, ${maxY}], size: ${croppedWidth}x${croppedHeight}`);

    const croppedPng = new PNG({ width: croppedWidth, height: croppedHeight });
    for (let y = 0; y < croppedHeight; y++) {
      for (let x = 0; x < croppedWidth; x++) {
        const srcIdx = (width * (minY + y) + (minX + x)) << 2;
        const dstIdx = (croppedWidth * y + x) << 2;
        croppedPng.data[dstIdx] = this.data[srcIdx];
        croppedPng.data[dstIdx + 1] = this.data[srcIdx + 1];
        croppedPng.data[dstIdx + 2] = this.data[srcIdx + 2];
        croppedPng.data[dstIdx + 3] = this.data[srcIdx + 3];
      }
    }

    const buffer = PNG.sync.write(croppedPng);
    fs.writeFileSync(outputPath, buffer);
    fs.writeFileSync(assetPath, buffer);
    console.log('Successfully created transparent cropped logo at:', outputPath);
  });
