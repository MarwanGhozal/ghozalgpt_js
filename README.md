## GhozalGPT v0.1 — a self-hosted AI assistant platform designed for privacy, speed, and control.

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
title Starting GhozalGPT - Local Server

:: Start Ollama model
echo Starting Ollama model...
start cmd /k "ollama run llama3:instruct"

:: Wait a bit for Ollama to start
timeout /t 10 /nobreak >nul

:: Start Node.js server
echo Starting backend server...
start cmd /k "node server.js"

:: OPTIONAL: Initialize SQLite if database file doesn't exist
:: (Uncomment if you want to auto-create db schema once)
if not exist ghozalgpt.db (
	echo Initializing SQLite database...
	sqlite3 ghozalgpt.db < init.sql
)

:: Launch the front-end in browser (index.html directly)
echo Opening GhozalGPT UI...
start "" "index.html"


---

## 🔍 Quick Troubleshooting

| Problem                       | Likely Cause         | Fix                                                          |
| ----------------------------- | -------------------- | ------------------------------------------------------------ |
| "Sorry, something went wrong" | Ollama isn't running | Run `ollama serve`                                           |
| Conversations don't load      | Backend not running  | Run `npm start`                                              |
| Model not found error         | LLaMA 3 not pulled   | Run `ollama pull llama3:instruct`                            |
| Slow responses                | Running on CPU       | Normal — LLaMA 3 is large. GPU speeds this up significantly. |
| CORS error in console         | Backend not running  | Run `npm start` first                                        |
```
