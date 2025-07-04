# Development Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Project Structure

```
src/
├── background/
│   └── service-worker.ts      # Background script (API calls, storage)
├── content/
│   └── content-script.ts      # Content script (text selection)
├── panel/
│   ├── components/            # Svelte components
│   ├── stores/               # Svelte stores (state management)
│   ├── App.svelte            # Main panel app
│   ├── index.html            # Panel HTML
│   ├── main.ts               # Panel entry point
│   └── style.css             # Panel styles
├── options/
│   ├── OptionsApp.svelte     # Options page app
│   ├── index.html            # Options HTML
│   ├── main.ts               # Options entry point
│   └── style.css             # Options styles
├── lib/
│   └── model-adapters/       # AI model adapters
│       ├── base.ts           # Base adapter class
│       ├── openai.ts         # OpenAI adapter
│       ├── claude.ts         # Claude adapter
│       ├── gemini.ts         # Gemini adapter
│       ├── custom.ts         # Custom model adapter
│       └── index.ts          # Adapter factory
└── types/
    └── index.ts              # TypeScript type definitions
```

## Architecture

### Message Flow
```
Content Script ←→ Service Worker ←→ Side Panel
                       ↓
                   AI Model APIs
```

### State Management
- **Svelte Stores**: Used for reactive state management
- **Chrome Storage**: Persistent storage for settings and chat history
- **Local Encryption**: API keys are encrypted before storage

### Model Adapters
Each AI provider has its own adapter that:
- Transforms requests to provider-specific format
- Handles streaming responses
- Normalizes responses to common format

## Adding New Features

### Adding a New AI Provider

1. **Create adapter class**
   ```typescript
   // src/lib/model-adapters/newprovider.ts
   export class NewProviderAdapter extends BaseModelAdapter {
     getApiUrl(): string { /* ... */ }
     getHeaders(): Record<string, string> { /* ... */ }
     transformRequest(request: ChatCompletionRequest): any { /* ... */ }
     transformResponse(response: any): ChatCompletionResponse { /* ... */ }
     parseStreamChunk(chunk: string): StreamChunk | null { /* ... */ }
   }
   ```

2. **Register in factory**
   ```typescript
   // src/lib/model-adapters/index.ts
   export function createModelAdapter(config: ModelConfig): BaseModelAdapter {
     switch (config.provider) {
       case 'newprovider':
         return new NewProviderAdapter(config);
       // ...
     }
   }
   ```

3. **Add to UI options**
   ```typescript
   // src/panel/components/ModelConfigForm.svelte
   <option value="newprovider">New Provider</option>
   ```

### Adding New UI Components

1. Create component in `src/panel/components/`
2. Import and use in parent components
3. Add any new stores in `src/panel/stores/`

## Testing

### Manual Testing
1. Build and load extension
2. Configure AI models in settings
3. Test chat functionality
4. Test text selection features
5. Test context menus

### Key Test Cases
- [ ] Model configuration (add/edit/delete)
- [ ] Chat sessions (create/switch/delete)
- [ ] Message sending and streaming
- [ ] Text selection and context menu
- [ ] Settings persistence
- [ ] Error handling

## Debugging

### Chrome DevTools
- **Service Worker**: `chrome://extensions/` → Inspect views: service worker
- **Side Panel**: Right-click panel → Inspect
- **Content Script**: F12 on any webpage → Console
- **Options Page**: Right-click options → Inspect

### Common Issues
1. **CORS errors**: Check API endpoints and permissions
2. **Storage issues**: Check chrome.storage permissions
3. **Message passing**: Verify message types and handlers
4. **Streaming**: Check ReadableStream support

## Build Process

### Development Build
```bash
npm run dev
```
- Starts Vite dev server
- Hot reload for panel and options
- Source maps enabled

### Production Build
```bash
npm run build
npm run package
```
- Minified output
- Copies manifest and icons
- Ready for Chrome Web Store

## Deployment

### Chrome Web Store
1. Create developer account
2. Prepare store listing
3. Upload packaged extension
4. Submit for review

### Manual Distribution
1. Build extension
2. Create ZIP file from `dist/` folder
3. Distribute ZIP file

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## Troubleshooting

### Extension won't load
- Check manifest.json syntax
- Verify all required files exist
- Check console for errors

### API calls failing
- Verify API keys are correct
- Check network connectivity
- Verify API endpoints

### UI not updating
- Check Svelte store subscriptions
- Verify message passing
- Check for JavaScript errors
