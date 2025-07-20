# Local PDF Content Extraction Fix

## 🔍 Problem Analysis

The SlimPaneAI extension was unable to extract content from locally opened PDF files (file:// URLs) for chat functionality. The issue was caused by:

1. **Missing file access permissions** in the extension manifest
2. **Missing message handler** for 'extract-pdf-content' in the background script
3. **Blocked file:// protocol** in the special page detection logic
4. **No local file handling** in the PDF processor
5. **Message interception** in App.svelte that was overriding background script responses
6. **PDF.js worker configuration** issue causing "No GlobalWorkerOptions.workerSrc specified" error

## 🛠️ Solution Implementation

### 1. Updated Extension Permissions (`manifest.json`)

```json
"host_permissions": [
  "*://*/*",
  "file:///*"  // Added for local file access
]
```

### 2. Fixed Background Script (`src/background/service-worker.ts`)

**a) Updated Special Page Detection:**
- Removed `file://` from blocked protocols list
- Added special handling to only block non-PDF file:// URLs

**b) Added PDF Content Extraction Handler:**
- New `handleExtractPDFContent()` function to fetch local PDF data
- Added 'extract-pdf-content' case in message handler
- Proper error handling with user-friendly messages

### 4. Fixed Message Interception (`src/panel/App.svelte`)

**Critical Fix:**
- Modified message handler to only respond to specific message types
- Prevented interception of 'extract-pdf-content' messages
- Added `shouldRespond` flag to control when responses are sent

### 5. Fixed PDF.js Worker Configuration (`src/lib/pdf-content/index.ts`)

**Complete Local PDF.js Configuration:**
- Replaced disabled worker (`workerSrc = ''`) with local worker file
- Changed PDF.js library import from `import('pdfjs-dist')` to local file import
- Added automatic copying of both `pdf.min.mjs` and `pdf.worker.min.mjs` from `node_modules/pdfjs-dist/build/`
- Used `chrome.runtime.getURL()` to load both library and worker locally
- Updated build script to automatically handle complete PDF.js deployment
- Added both files to `web_accessible_resources` in manifest

### 3. Enhanced PDF Processor (`src/lib/pdf-content/index.ts`)

**a) Updated Main Extraction Method:**
- Added local file detection (`url.startsWith('file://')`)
- Routes local files to background script for data fetching

**b) Added Local PDF Loading:**
- New `loadLocalPDF()` method for background script communication
- Converts array data back to Uint8Array for PDF.js processing

**c) Fixed Utility Methods:**
- Updated title extraction for local file paths
- Fixed domain extraction (uses 'localhost' for local files)
- Applied changes to all PDF methods (`extractFromLargePDF`, `getPDFInfo`)

## 🧪 Testing Instructions

### Prerequisites
1. **Build and package the extension:**
   ```bash
   npm run build
   node scripts/package.js
   ```
2. Install/update the SlimPaneAI extension
3. Go to `chrome://extensions/`
4. Find SlimPaneAI and click "Details"
5. **Enable "Allow access to file URLs"** ⚠️ **CRITICAL STEP**
6. Reload the extension

### Test Steps
1. **Open a local PDF file:**
   - Drag & drop a PDF into Chrome, or
   - Use File > Open File to select a PDF

2. **Test page chat functionality:**
   - Open SlimPaneAI side panel
   - Enable page chat mode (toggle button)
   - Ask a question about the PDF content
   - Verify AI can access and respond based on PDF content

3. **Use the test file:**
   - Open `test-local-pdf.html` in Chrome
   - Follow the testing instructions
   - Verify background script communication works

### Expected Behavior
- ✅ Local PDFs should extract content successfully
- ✅ Progress indicators should work properly
- ✅ Error messages should be helpful and actionable
- ✅ Same user experience as online PDFs

## 🔧 Technical Details

### Message Flow for Local PDFs
1. Content script detects local PDF (`file://` URL)
2. Calls `loadLocalPDF()` method
3. Sends 'extract-pdf-content' message to background script
4. Background script fetches PDF data using `fetch()`
5. Returns PDF data as array to content script
6. Content script converts to Uint8Array and processes with PDF.js

### Error Handling
- **File access denied**: Clear instructions about enabling file URL permission
- **File not found**: Helpful message about file path and availability
- **PDF processing errors**: Graceful fallback with error details

### Security Considerations
- Only PDF files are allowed through file:// protocol
- Background script validates PDF URLs before processing
- No arbitrary file access - only PDF content extraction

## 🚀 Benefits

1. **Complete local PDF support**: Works with any locally opened PDF
2. **Consistent user experience**: Same interface for local and online PDFs
3. **Robust error handling**: Clear feedback when issues occur
4. **Maintains security**: Only allows PDF file access
5. **Future-proof**: Architecture supports additional document types

## 🔍 Troubleshooting

### Common Issues

**"Allow access to file URLs" not enabled:**
- Go to chrome://extensions/
- Find SlimPaneAI > Details
- Enable the file access permission
- Reload the extension

**PDF not extracting:**
- Check browser console for error messages
- Verify PDF file is not corrupted
- Ensure file is not open in another application
- Try refreshing the PDF page

**Background script errors:**
- Check extension console in chrome://extensions/
- Look for fetch errors or permission issues
- Verify the PDF URL is correctly formatted

### Debug Information
- All operations are logged to console with 'SlimPaneAI' prefix
- Background script logs show PDF data fetch status
- Content script logs show PDF processing progress

## 📝 Files Modified

1. `manifest.json` - Added file:// permissions and PDF worker resource
2. `src/background/service-worker.ts` - Added PDF extraction handler
3. `src/lib/pdf-content/index.ts` - Enhanced PDF processor and fixed worker config
4. `src/panel/App.svelte` - Fixed message interception issue
5. `scripts/package.js` - Added automatic PDF worker copying
6. `vite.config.ts` - Added PDF.js optimization settings
7. `vite.config.content.ts` - Added PDF.js worker support for content script
8. `test-local-pdf.html` - Testing utility (new)
9. `LOCAL_PDF_FIX_SUMMARY.md` - This documentation (new)

The fix maintains backward compatibility while adding comprehensive local PDF support with proper error handling and user feedback.
