@echo off
title Starting Ghozal AI - Local Server

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
if not exist ghozal_ai.db (
	echo Initializing SQLite database...
	sqlite3 ghozal_ai.db < init.sql
)

:: Launch the front-end in browser (index.html directly)
echo Opening GhozalGPT UI...
start "" "index.html"
