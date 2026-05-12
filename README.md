## 🚀 Local Deployment

### Step 1 — Start Ollama

In a terminal, make sure Ollama is running:

```bash
ollama serve
```

If it's already running as a background service (which is the default on most systems after install), you can skip this. You can verify it's up by visiting `http://localhost:11434` in your browser — it should return a simple response.

### Step 2 — Start the backend

In your `ghozalgpt/` folder:

```bash
npm start
```

You should see:

```
✅ GhozalGPT backend running at http://localhost:3001
```

### Step 3 — Open the frontend

Since the frontend is pure HTML with no build step, you can open it directly:

```bash
# On Windows
start index.html

# On macOS
open index.html

# Or just drag index.html into your browser
```

> **Important:** Because `script.js` makes `fetch()` calls to `http://localhost:3001`, you need the backend running before the page loads — otherwise conversations won't load.

### Optional: Windows Batch File

The original project included a `start-ghozal-ai.bat` file for launching everything with one double-click. Create it:

```bat
@echo off
title GhozalGPT Launcher
echo Starting Ollama...
start "" ollama serve

echo Waiting for Ollama to be ready...
timeout /t 3 /nobreak >nul

echo Starting GhozalGPT backend...
cd /d "%~dp0"
start "" cmd /k "npm start"

echo Waiting for backend...
timeout /t 2 /nobreak >nul

echo Opening GhozalGPT...
start "" index.html
```

---

## 🔍 Quick Troubleshooting

| Problem                       | Likely Cause         | Fix                                                          |
| ----------------------------- | -------------------- | ------------------------------------------------------------ |
| "Sorry, something went wrong" | Ollama isn't running | Run `ollama serve`                                           |
| Conversations don't load      | Backend not running  | Run `npm start`                                              |
| Model not found error         | LLaMA 3 not pulled   | Run `ollama pull llama3:instruct`                            |
| Slow responses                | Running on CPU       | Normal — LLaMA 3 is large. GPU speeds this up significantly. |
| CORS error in console         | Backend not running  | Run `npm start` first                                        |
