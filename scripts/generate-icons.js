const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Erstelle das Icons-Verzeichnis, falls es nicht existiert
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon-Größen für PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Verwende das Logo mit farbigem Hintergrund für die Icons
const sourceImage = path.join(__dirname, '..', 'public', 'lesefluss_logo_1200.png');

async function generateIcons() {
  try {
    console.log('Generiere PWA-Icons...');
    
    for (const size of sizes) {
      const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(outputFile);
        
      console.log(`✅ Icon erstellt: ${outputFile}`);
    }
    
    console.log('✅ Alle Icons wurden erfolgreich generiert!');
  } catch (error) {
    console.error('❌ Fehler beim Generieren der Icons:', error);
  }
}

generateIcons();
