const express = require("express"); // Our web framework (Acts like a module, gives us a bunch of functions)
const cors = require("cors"); // allows the browser frontend to call the backend (Cross-Origin Resource Sharing)
const bodyParser = require("body-parser"); // parses incoming JSON requests bodies and puts them in req.body
const axios = require("axios"); // makes HTTP requests from Node.js to external APIs(Ollama)
const Database = require("better-sqlite3"); // SQLite database

const MODEL_USED = "llama3";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = new Database("ghozalgpt.db");
// Create tables if they don't exist yet
db.exec(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME
)`);

db.exec(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    sender TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// --- MEMORY INJECTION LOGIC ---
// Decides whether to inject the full system prompt + memory context
// Only triggers on certain keywords or on the very first message
function shouldInjectMemory(messages) {
  if (!messages || messages.length === 0) return true;

  const lastUserMsg = messages
    .slice()
    .reverse()
    .find((m) => m.sender === "You");

  if (!lastUserMsg) return true;

  const content = lastUserMsg.message.toLowerCase();
  const triggers = [
    "who are you",
    "about yourself",
    "your background",
    "what can you do",
  ];

  return triggers.some((t) => content.includes(t));
}

app.get("/conversations", async (req, res) => {
  const conversations = {};
  const convoRows = db
    .prepare("SELECT * FROM conversations ORDER BY last_message_at DESC")
    .all();

  const msgRows = db.prepare("SELECT * FROM messages").all();

  convoRows.forEach((convo) => {
    conversations[convo.id] = {
      name: convo.name,
      messages: [],
    };
  });

  msgRows.forEach((msg) => {
    if (conversations[msg.conversation_id]) {
      conversations[msg.conversation_id].messages.push({
        sender: msg.sender,
        message: msg.message,
        timestamp: msg.timestamp,
      });
    }
  });

  res.json(conversations);
});

app.post("/chat", async (req, res) => {
  const { message, history, allConversations, conversationId } = req.body;
  const convoId = conversationId;

  // Check if the user wants to cross-reference another conversation
  const wantsReference =
    message.startsWith(">>") ||
    message.toLowerCase().includes("refer to") ||
    message.toLowerCase().includes("remember when");

  // Extract a referenced conversation ID if present (e.g. "convo-12345")
  const refIdMatch = message.match(/(?:convo-|Conv\s*)(\d+)/);
  const referenceId = refIdMatch ? `convo-${refIdMatch[1]}` : null;

  const conversationHistory = history
    .map((entry) => `${entry.sender}: ${entry.message}`)
    .join("\n");

  let referencedHistory = "";

  if (referenceId && allConversations[referenceId]) {
    referencedHistory = allConversations[referenceId].messages
      .map((entry) => `${entry.sender}: ${entry.message}`)
      .join("\n");
  }

  // Flatten ALL conversations into a single memory block
  const allMemory = Object.values(allConversations || {})
    .flatMap((c) => c.messages || [])
    .map((entry) => `${entry.sender}: ${entry.message}`)
    .join("\n");

  const injectMemory = wantsReference || shouldInjectMemory(history);

  // Build the prompt we will send to Ollama
  let prompt;
  if (injectMemory) {
    prompt = `
            You are GhozalGPT, a local AI assistant running on the user's private system using the ${MODEL_USED} model.
            You have no relation to OpenAI, ChatGPT, or any third-party AI service.
            All responses are generated locally — user data is never uploaded, logged, or shared.

            Your personality blends cyberpunk aesthetics with Ancient Egyptian wisdom.
            You speak clearly, helpfully, and respectfully.

            These are all past conversations:
            ${allMemory}

            This is the current conversation history:
            ${conversationHistory}

            Referenced conversation (${referenceId || "none"}):
            ${referencedHistory || "None"}

            User: ${message}
            GhozalGPT:`.trim();
  } else {
    prompt = `
            You are GhozalGPT, a local AI assistant using ${MODEL_USED}, unaffiliated with OpenAI or ChatGPT. Everything stays private.

            User: ${message}
            GhozalGPT:`.trim();
  }
  try {
    // Call Ollama's local API
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3:instruct",
      prompt,
      stream: false,
    });

    const reply = response.data.response;
    const now = new Date().toISOString();

    // Persist to SQLite
    if (convoId) {
      db.prepare(
        `
            INSERT INTO conversations (id, name, last_message_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            last_message_at = excluded.last_message_at
        `,
      ).run(
        convoId,
        allConversations[convoId]?.name || `Conv ${convoId.split("-")[1]}`,
        now,
      );

      db.prepare(
        "INSERT INTO messages (conversation_id, sender, message) VALUES (?, ?, ?)",
      ).run(convoId, "You", message);

      db.prepare(
        "INSERT INTO messages (conversation_id, sender, message) VALUES (?, ?, ?)",
      ).run(convoId, "GhozalGPT", reply);
    }

    res.json({ reply });
  } catch (error) {
    console.error("Ollama error:", error.message);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});

// POST /rename — updates a conversation's display name
app.post("/rename", (req, res) => {
  const { id, name } = req.body;
  db.prepare("UPDATE conversations SET name = ? WHERE id = ?").run(name, id);
  res.json({ success: true });
});

// POST /delete — deletes a conversation and all its messages
app.post("/delete", (req, res) => {
  const { id } = req.body;
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  res.json({ success: true });
});

// Start server
app.listen(3001, () =>
  console.log("✅ GhozalGPT backend running at http://localhost:3001"),
);
