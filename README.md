# SlimPaneAI

A lightweight AI-powered browser extension with side panel chat and text enhancement features.

## ✨ Features

- **🤖 Side Panel Chat**: AI-powered chat interface accessible from any webpage
- **📝 Text Enhancement**: Select text on any webpage to summarize, translate, or explain with AI
- **🔄 Multi-Model Support**: Compatible with OpenAI, Anthropic Claude, Google Gemini, and custom models
- **🔒 Privacy First**: All data stored locally for privacy
- **⚡ Lightweight**: Built with Svelte for minimal bundle size and optimal performance
- **🌍 Internationalization**: Support for multiple languages (Chinese/English)
- **🎨 Modern UI**: Clean, responsive design with dark/light theme support
- **📊 Math Rendering**: Support for LaTeX math formulas using KaTeX

## 🤖 Supported AI Models

### OpenAI
- GPT-4o, GPT-4o mini
- GPT-4, GPT-4 Turbo
- GPT-3.5 Turbo
- o1-preview, o1-mini (with reasoning support)

### Anthropic Claude
- Claude 3.5 Sonnet
- Claude 3 Opus, Sonnet, Haiku

### Google Gemini
- Gemini Pro
- Gemini Pro Vision

### Custom Models
- Any OpenAI-compatible API
- Custom base URLs and API keys
- Support for local models (Ollama, etc.)

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package extension
npm run package
```

### Project Structure
```
src/
├── background/          # Service worker
├── content/            # Content scripts
├── panel/              # Side panel UI
├── options/            # Options page
├── lib/                # Shared libraries
│   └── model-adapters/ # AI model adapters
└── types/              # TypeScript types
```

## Installation

### Development Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run package`
5. Open Chrome and go to `chrome://extensions/`
6. Enable "Developer mode"
7. Click "Load unpacked" and select the `dist` folder

### Usage
1. Configure your AI models in the extension settings
2. Click the extension icon to open the side panel
3. Start chatting with AI
4. Select text on any webpage and use the context menu for quick AI actions

## Configuration

### Adding AI Models
1. Open the extension settings
2. Click "Add Model"
3. Select your provider (OpenAI, Claude, Gemini, or Custom)
4. Enter your API key and configure settings
5. Save the configuration

### API Keys
- Your API keys are stored locally and encrypted
- Never shared with external services
- Only used to communicate with your chosen AI providers

## Privacy

- All chat history is stored locally in your browser
- API keys are encrypted before storage
- No data is sent to our servers
- Only communicates with your configured AI providers

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
