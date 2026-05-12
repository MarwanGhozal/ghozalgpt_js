let currentConversationId = null;
let conversations = {}; // In-memory store: { [id]: { name, messages: [] } }
const userInput = document.getElementById("user-input");

// ─── LOAD ────────────────────────────────────────────────────────────────────

// On page load: fetch all conversations from the backend
async function loadConversations() {
  const res = await fetch("http://localhost:3001/conversations");
  const data = await res.json();

  conversations = {};
  for (const [id, convo] of Object.entries(data)) {
    conversations[id] = {
      name: convo.name,
      messages: convo.messages || [],
    };
  }

  // Support URL hash navigation (e.g. http://localhost/#convo-123456)
  const hashId = window.location.hash.replace("#", "");
  if (hashId && conversations[hashId]) {
    switchConversation(hashId);
  } else {
    const firstId = Object.keys(conversations)[0];
    if (firstId) {
      switchConversation(firstId);
    } else {
      createNewConversation(); // No saved convos? Start fresh
    }
  }
}

// ─── CONVERSATION MANAGEMENT ─────────────────────────────────────────────────

function createNewConversation() {
  const id = `convo-${Date.now()}`; // Timestamp-based ID, e.g. "convo-1719000000000"
  conversations[id] = {
    name: `Conv ${id.split("-")[1]}`,
    messages: [],
  };
  currentConversationId = id;
  updateURL();
  renderConversationTabs();
  renderMessages();
}

function switchConversation(id) {
  currentConversationId = id;
  updateURL();
  renderMessages();
  renderConversationTabs();
}

function updateURL() {
  // Updates the browser URL hash without triggering a page reload
  history.replaceState(null, "", `#${currentConversationId}`);
}

// ─── RENDER ──────────────────────────────────────────────────────────────────

function renderConversationTabs() {
  const list = document.getElementById("convo-list");
  list.innerHTML = "";

  Object.entries(conversations).forEach(([id, convo]) => {
    const name = convo.name || `Conv ${id.split("-")[1]}`;
    const item = document.createElement("li");
    item.className = id === currentConversationId ? "active" : "";

    item.innerHTML = `
      <div class="tab">
        <span class="convo-name" title="Click to copy ID">${name}</span>
        <div class="dropdown">
          <button class="dropdown-toggle">⋮</button>
          <div class="dropdown-menu">
            <button onclick="renameConversation('${id}', event)">Rename</button>
            <button onclick="exportConversation('${id}', event)">Export</button>
            <button onclick="deleteConversation('${id}', event)">Delete</button>
            <button onclick="copyConversationId('${id}', event)">Copy ID</button>
          </div>
        </div>
      </div>
    `;

    // Click the name to copy the ID to clipboard (used for cross-referencing)
    item.querySelector(".convo-name").onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id);
      alert("Conversation ID copied: " + id);
    };

    // Toggle dropdown on ⋮ button click
    item.querySelector(".dropdown-toggle").onclick = (e) => {
      e.stopPropagation();
      const menu = e.currentTarget.nextElementSibling;
      document.querySelectorAll(".dropdown-menu").forEach((m) => {
        if (m !== menu) m.style.display = "none";
      });
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    };

    // Click anywhere else on the tab to switch to that conversation
    item.onclick = (e) => {
      if (!e.target.closest("button")) switchConversation(id);
    };

    list.appendChild(item);
  });

  // Click outside any dropdown to close all of them
  document.body.onclick = () => {
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      m.style.display = "none";
    });
  };
}

function renderMessages() {
  const box = document.getElementById("chat-box");
  box.innerHTML = "";

  const messages = conversations[currentConversationId]?.messages || [];

  messages.forEach((msg, index) => {
    const msgDiv = document.createElement("div");
    msgDiv.className =
      msg.sender === "You" ? "user-message" : "assistant-message";

    const formatted = formatMessage(msg.message);

    if (msg.sender === "You") {
      msgDiv.innerHTML = `<strong>You:</strong><br>${formatted}`;
    } else if (index === messages.findIndex((m) => m.sender === "GhozalGPT")) {
      // First GhozalGPT message gets a special styled label
      msgDiv.innerHTML = `<strong class="ghozal-label">GhozalGPT</strong><br>${formatted}`;
    } else {
      msgDiv.innerHTML = formatted;
    }

    box.appendChild(msgDiv);
  });

  box.scrollTop = box.scrollHeight;
}

// Lightweight markdown-like formatter
function formatMessage(text) {
  return text
    .replace(/```([\s\S]*?)```/g, (_, code) => {
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre><code>${escaped}</code></pre>`;
    })
    .replace(
      /`([^`]+)`/g,
      (_, code) =>
        `<code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>`,
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n- (.*?)(?=\n|$)/g, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
}

// ─── MESSAGING ───────────────────────────────────────────────────────────────

function sendMessage() {
  const userText = userInput.value.trim();
  if (!userText || !currentConversationId) return;

  const thisConvoId = currentConversationId;
  appendMessage("You", userText);
  userInput.value = "";

  fetch("http://localhost:3001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: thisConvoId,
      message: userText,
      history: conversations[thisConvoId].messages || [],
      allConversations: conversations,
    }),
  })
    .then((res) => res.json())
    .then(async (data) => {
      // Animate the reply character by character
      await typeMessage(thisConvoId, data.reply);

      // Smart auto-title: if the convo still has the default name, generate one
      const currentName = conversations[thisConvoId].name;
      if (/^Conv \d+$/.test(currentName)) {
        const stopwords = [
          "the",
          "a",
          "an",
          "and",
          "or",
          "with",
          "to",
          "my",
          "for",
          "of",
          "in",
          "on",
          "at",
          "from",
        ];
        const words = userText
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((word) => !stopwords.includes(word.toLowerCase()));

        const shortTitle = words.slice(0, 4).join(" ") || "New Conversation";
        conversations[thisConvoId].name = shortTitle;

        await fetch("http://localhost:3001/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: thisConvoId, name: shortTitle }),
        });
      }

      if (thisConvoId === currentConversationId) renderMessages();

      // Re-sort sidebar by most recent activity
      const now = new Date().toISOString();
      conversations[thisConvoId].last_message_at = now;
      conversations = Object.fromEntries(
        Object.entries(conversations).sort(
          (a, b) =>
            new Date(b[1].last_message_at) - new Date(a[1].last_message_at),
        ),
      );

      renderConversationTabs();
    })
    .catch((err) => {
      conversations[thisConvoId].messages.push({
        sender: "GhozalGPT",
        message: "Error: " + err.message,
      });
      if (thisConvoId === currentConversationId) renderMessages();
    });
}

// Typing animation — renders one character at a time
async function typeMessage(convoId, fullText, sender = "GhozalGPT") {
  const message = { sender, message: "" };
  conversations[convoId].messages.push(message);
  renderMessages();

  const chatBox = document.getElementById("chat-box");

  for (let i = 0; i < fullText.length; i++) {
    message.message += fullText[i];
    if (convoId === currentConversationId) {
      renderMessages();
      chatBox.scrollTop = chatBox.scrollHeight;
    }
    await new Promise((r) => setTimeout(r, 15)); // 15ms per character
  }
}

function appendMessage(sender, message) {
  if (!currentConversationId) return;
  conversations[currentConversationId].messages.push({ sender, message });
  renderMessages();
}

// ─── CONVERSATION ACTIONS ────────────────────────────────────────────────────

function copyConversationId(id, event) {
  event.stopPropagation();
  navigator.clipboard.writeText(id);
  alert("Copied conversation ID: " + id);
}

async function renameConversation(id, event) {
  event.stopPropagation();
  const numOnly = prompt("Enter new number:");
  if (numOnly) {
    const newName = `Conv ${numOnly}`;
    conversations[id].name = newName;
    await fetch("http://localhost:3001/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: newName }),
    });
    renderConversationTabs();
  }
}

async function deleteConversation(id, event) {
  event.stopPropagation();
  if (confirm("Delete this conversation?")) {
    await fetch("http://localhost:3001/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    delete conversations[id];
    if (currentConversationId === id) createNewConversation();
    renderConversationTabs();
  }
}

function exportConversation(id, event) {
  event.stopPropagation();
  const content = conversations[id].messages
    .map((msg) => `${msg.sender}: ${msg.message}`)
    .join("\n");

  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${conversations[id].name || "conversation"}.txt`;
  a.click();
}

// ─── URL HASH NAVIGATION ─────────────────────────────────────────────────────

window.addEventListener("hashchange", () => {
  const id = window.location.hash.replace("#", "");
  if (id && conversations[id]) switchConversation(id);
});

// ─── INIT ────────────────────────────────────────────────────────────────────
loadConversations();
