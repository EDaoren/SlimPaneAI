import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function copyManifest() {
  const manifestPath = path.join(rootDir, 'manifest.json');
  const distManifestPath = path.join(distDir, 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, distManifestPath);
    console.log('✓ Copied manifest.json');
  }
}

async function copyPDFFiles() {
  // Try to copy from node_modules first
  const nodeModulesPdfSrc = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.min.mjs');
  const nodeModulesWorkerSrc = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');

  // Copy PDF.js main library directly to dist root
  const pdfDest = path.join(distDir, 'pdf.mjs');
  if (fs.existsSync(nodeModulesPdfSrc)) {
    fs.copyFileSync(nodeModulesPdfSrc, pdfDest);
    console.log('✓ Copied PDF.js library from node_modules');
  } else {
    // Fallback: create a simple message file
    const fallbackContent = `// PDF.js library not found in node_modules
// Please install pdfjs-dist: npm install pdfjs-dist
console.error('PDF.js library not available. Please install pdfjs-dist package.');
export default null;`;
    fs.writeFileSync(pdfDest, fallbackContent);
    console.warn('⚠ PDF.js library not found, created fallback file');
  }

  // Copy PDF.js worker directly to dist root
  const workerDest = path.join(distDir, 'pdf.worker.js');
  if (fs.existsSync(nodeModulesWorkerSrc)) {
    fs.copyFileSync(nodeModulesWorkerSrc, workerDest);
    console.log('✓ Copied PDF.js worker from node_modules');
  } else {
    // Fallback: create a simple message file
    const fallbackContent = `// PDF.js worker not found in node_modules
// Please install pdfjs-dist: npm install pdfjs-dist
console.error('PDF.js worker not available. Please install pdfjs-dist package.');`;
    fs.writeFileSync(workerDest, fallbackContent);
    console.warn('⚠ PDF.js worker not found, created fallback file');
  }
}

async function copyIcons() {
  const iconsDir = path.join(rootDir, 'icons');
  const distIconsDir = path.join(distDir, 'icons');

  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }

  if (fs.existsSync(iconsDir)) {
    const iconFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.png'));

    if (iconFiles.length > 0) {
      // Copy existing icon files and rename them to the required format
      iconFiles.forEach(file => {
        const sourcePath = path.join(iconsDir, file);

        // Copy the icon to all required sizes (we'll use the same image for all sizes for now)
        const requiredSizes = [16, 32, 48, 128];
        requiredSizes.forEach(size => {
          const destPath = path.join(distIconsDir, `icon-${size}.png`);
          fs.copyFileSync(sourcePath, destPath);
        });
      });
      console.log('✓ Copied and renamed icons');
    } else {
      console.warn('⚠ No PNG icons found, creating placeholder icons');
      createPlaceholderIcons();
    }
  } else {
    console.warn('⚠ Icons directory not found, creating placeholder icons');
    createPlaceholderIcons();
  }
}

function createPlaceholderIcons() {
  const distIconsDir = path.join(distDir, 'icons');
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }
  
  // Create simple SVG icons as placeholders
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="24" fill="url(#gradient)"/>
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#8b5cf6"/>
      </linearGradient>
    </defs>
    <text x="64" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">AI</text>
  </svg>`;
  
  const sizes = [16, 32, 48, 128];
  sizes.forEach(size => {
    fs.writeFileSync(
      path.join(distIconsDir, `icon-${size}.png`),
      svgIcon // In a real scenario, you'd convert SVG to PNG
    );
  });
  
  console.log('✓ Created placeholder icons');
}

async function updateVersion() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(distDir, 'manifest.json');
  
  if (fs.existsSync(packageJsonPath) && fs.existsSync(manifestPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    manifest.version = packageJson.version;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Updated version to ${packageJson.version}`);
  }
}

async function moveHtmlFiles() {
  // Move panel HTML file and fix paths
  const panelSrc = path.join(distDir, 'src', 'panel', 'index.html');
  const panelDest = path.join(distDir, 'panel.html');

  if (fs.existsSync(panelSrc)) {
    let content = fs.readFileSync(panelSrc, 'utf8');
    // Fix relative paths - remove ../../ prefix
    content = content.replace(/\.\.\/\.\.\//g, './');
    fs.writeFileSync(panelDest, content);
    console.log('✓ Moved and fixed panel.html');
  }

  // Move options HTML file and fix paths
  const optionsSrc = path.join(distDir, 'src', 'options', 'index.html');
  const optionsDest = path.join(distDir, 'options.html');

  if (fs.existsSync(optionsSrc)) {
    let content = fs.readFileSync(optionsSrc, 'utf8');
    // Fix relative paths - remove ../../ prefix
    content = content.replace(/\.\.\/\.\.\//g, './');
    fs.writeFileSync(optionsDest, content);
    console.log('✓ Moved and fixed options.html');
  }

  // Clean up src directory
  const srcDir = path.join(distDir, 'src');
  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
    console.log('✓ Cleaned up src directory');
  }
}

async function main() {
  console.log('📦 Packaging SlimPaneAI extension...\n');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  try {
    await copyManifest();
    await copyPDFFiles();
    await copyIcons();
    await moveHtmlFiles();
    await updateVersion();

    console.log('\n✅ Extension packaged successfully!');
    console.log(`📁 Output directory: ${distDir}`);
    console.log('\n📋 Next steps:');
    console.log('1. Open Chrome and go to chrome://extensions/');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked" and select the dist folder');
  } catch (error) {
    console.error('❌ Packaging failed:', error);
    process.exit(1);
  }
}

main();
