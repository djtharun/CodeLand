# VR Debugging Assistant

An immersive Virtual Reality application that helps developers debug code with AI-powered insights in a 3D environment.

## Features

- 🎮 **Immersive VR Experience** - Debug code in a 3D virtual environment
- 🤖 **AI-Powered Analysis** - Get intelligent bug detection and suggestions
- 📊 **Code Visualization** - See code flow and structure in 3D
- 🔍 **Static Analysis** - Instant feedback without API calls
- 🌐 **Multi-Language Support** - JavaScript, Python, TypeScript, Java, C#, C++
- 🎯 **Interactive Nodes** - Click to inspect specific code lines

## Project Structure

```
vr-debug-assistant/
├── public/
│   ├── index.html          # Main HTML file
│   └── styles.css          # Styling
├── src/
│   ├── js/
│   │   ├── main.js         # Application entry point
│   │   ├── codeAnalyzer.js # Code analysis logic
│   │   ├── vrScene.js      # VR scene management
│   │   └── uiController.js # UI updates
│   └── utils/
│       └── helpers.js      # Utility functions
├── api/
│   └── analyze.js          # Serverless API endpoint
├── package.json
├── vercel.json             # Vercel configuration
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Vercel CLI (for deployment)

## Installation

1. **Clone or create the project:**
```bash
mkdir vr-debug-assistant
cd vr-debug-assistant
```

2. **Create all the files** as shown in the structure above

3. **Install dependencies:**
```bash
npm install
```

4. **Set up environment variables:**

Create a `.env` file in the root:
```
OPENROUTER_API_KEY=your_api_key_here
```

Get your API key from: https://openrouter.ai/keys

## Running Locally

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Run development server:**
```bash
vercel dev
```

3. **Open your browser:**
```
http://localhost:3000
```

## Deployment to Vercel

1. **Login to Vercel:**
```bash
vercel login
```

2. **Deploy:**
```bash
vercel
```

3. **Set environment variables in Vercel:**
```bash
vercel env add OPENROUTER_API_KEY
```

4. **Deploy to production:**
```bash
vercel --prod
```

## Usage

1. **Upload Code File**
   - Click "Choose File" and select your code file (.js, .py, .ts, etc.)

2. **Select Language**
   - Choose the programming language from the dropdown

3. **Choose Analysis Mode**
   - **Static Analysis**: Fast, offline analysis
   - **AI Analysis**: Advanced AI-powered insights (requires API key)

4. **Analyze**
   - Click "Analyze Code" to get bug reports and suggestions

5. **Visualize**
   - Click "Visualize Flow" to see your code in 3D
   - Click on nodes to inspect specific lines

6. **Navigate VR**
   - Use mouse to look around
   - Use WASD keys to move (desktop)
   - Click buttons or nodes to interact

## Alternative: Run Without Vercel

If you want to run without Vercel (static server only, no AI):

1. **Create a simple server:**
```bash
npm install -g http-server
```

2. **Run:**
```bash
http-server public -p 8080
```

3. **Open:**
```
http://localhost:8080
```

Note: AI analysis will not work without the serverless function.

## Configuration

### vercel.json

Configure routing and environment variables:
- Routes static files from `/public`
- Routes API calls to `/api`
- Sets environment variables

### package.json

Defines scripts:
- `npm run dev` - Start development server
- `npm start` - Alias for dev

## API Endpoints

### POST /api/analyze

Analyze code with AI.

**Request:**
```json
{
  "code": "function example() { ... }",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": "Analysis results..."
}
```

## Troubleshooting

### Port Already in Use
```bash
vercel dev --listen 3001
```

### API Key Issues
- Ensure `OPENROUTER_API_KEY` is set correctly
- Check Vercel environment variables dashboard
- Verify API key is active on OpenRouter

### Module Import Errors
- Make sure all files use `export` and `import` correctly
- Check file paths in HTML script tags
- Use `type="module"` in script tags

### VR Not Working
- Ensure A-Frame is loading correctly
- Check browser console for errors
- Test in VR-compatible browser (Chrome, Firefox)

## Browser Support

- Chrome (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari (limited VR support)
- Edge

## Technologies Used

- **A-Frame 1.4.2** - VR framework
- **Vercel** - Serverless deployment
- **OpenRouter API** - AI analysis
- **Vanilla JavaScript** - No frameworks needed
- **ES6 Modules** - Modern JavaScript

## Future Enhancements

- [ ] Multi-user collaboration
- [ ] Voice commands
- [ ] More AI models
- [ ] Code execution visualization
- [ ] Breakpoint debugging
- [ ] GitHub integration
- [ ] Real-time collaboration
- [ ] VR headset support (WebXR)

## License

MIT License - Feel free to use for your projects!

## Support

For issues or questions:
- Check the troubleshooting section
- Review browser console errors
- Ensure all dependencies are installed

## Credits

Built with ❤️ using A-Frame and modern web technologies.