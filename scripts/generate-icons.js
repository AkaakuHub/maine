const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#1a1a1a"/>
  <circle cx="256" cy="200" r="120" fill="#333333" stroke="#666666" stroke-width="4"/>
  <path d="M220 160v80l60-40-60-40z" fill="#ffffff"/>
  <text x="256" y="350" font-family="Arial, sans-serif" font-size="32" fill="#ffffff" text-anchor="middle" font-weight="bold">Video</text>
  <text x="256" y="390" font-family="Arial, sans-serif" font-size="24" fill="#cccccc" text-anchor="middle">Storage</text>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  // Generate apple-touch-icon
  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  
  console.log('Generated: apple-touch-icon.png');
  
  // Generate favicon
  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  
  console.log('Generated: favicon.png');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
