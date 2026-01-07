let notificationsEnabled = true;
let darkMode = false;

var audio = new Audio('./assets/notification.mp3');
audio.volume = 0.6;
  // Attempt to unlock audio on first user interaction to satisfy autoplay policies


// Connect to global Gun relay server
var gun = Gun({peers: ['https://gun.o8.is/gun', 'https://gun.octalmage.com/gun']})

const users = gun.get('users');
let messages = null; // will point to current chat messages node

// read chat from URL or default
function getChatFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('chat') || 'mainlobby';
  } catch (e) { return 'mainlobby'; }
}

let currentChat = getChatFromUrl();

let old;

const loginModal = new bootstrap.Modal('#login-modal');
const loginOpener = document.getElementById('login-opener');
const inputDiv = document.getElementById('input');
const messagesDiv = document.getElementById('messages');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const chatNameInput = document.getElementById('chatName');
const joinBtn = document.getElementById('joinBtn');
const roomSelect = document.getElementById('rooms');
const shareUrlInput = document.getElementById('shareUrl');
const copyBtn = document.getElementById('copyBtn');
const notificationsToggle = document.getElementById("notifications-toggle");
const themeToggle = document.getElementById("theme-toggle");

let lastMessage;
let currentUser;
let prevMessages = null;
let currentListener = null;
let renderedKeys = new Set();
let currentAlias = null;

const input = msgInput;
let currentFocus = -1;
let dataList = [];

function setButtonIcon(buttonId, iconName) {
    const button = document.getElementById(buttonId);
    button.innerHTML = `<i class="bi ${iconName}"></i>`;
}

function updateTheme(theme) {
    localStorage.setItem('color-theme', theme);
    document.body.parentElement.setAttribute("data-bs-theme", theme);
    document.querySelectorAll(theme === 'dark' ? '.btn-light' : '.btn-dark').forEach(e => {
        e.classList.remove(theme === 'dark' ? 'btn-light' : 'btn-dark');
        e.classList.add(theme === 'dark' ? 'btn-dark' : 'btn-light');
    })
}

fetch('quotes.json')
    .then(response => response.json())
    .then(data => {
        dataList = data.map(item => item.text);
        // if quotes load after messages listener attached, refresh display
        if (messages) {
          loadMessages();
        }
    })
    .catch(error => console.error('Error loading quotes:', error));

notificationsEnabled = (localStorage.getItem('notify-sound') !== 'false');
darkMode = (localStorage.getItem('color-theme') === 'dark');

updateTheme(darkMode ? 'dark' : 'light')

setButtonIcon('notifications-toggle', notificationsEnabled ? 'bi-bell-fill' : 'bi-bell-slash-fill')
setButtonIcon('theme-toggle', darkMode ? 'bi-sun-fill' : 'bi-moon-fill')

notificationsToggle.addEventListener('click', function() {
  notificationsEnabled = !notificationsEnabled;
  localStorage.setItem('notify-sound', notificationsEnabled ? 'true' : 'false');
  setButtonIcon('notifications-toggle', notificationsEnabled ? 'bi-bell-fill' : 'bi-bell-slash-fill')
});

themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    updateTheme(darkMode ? 'dark' : 'light')
    setButtonIcon('theme-toggle', darkMode ? 'bi-sun-fill' : 'bi-moon-fill')
});

msgInput.addEventListener("input", function() {
  const value = this.value;
  closeAllLists();
  currentFocus = -1;
  if (!value) return false;

  const list = document.createElement("ul");

  list.setAttribute("class", "dropdown-menu");

  this.parentNode.prepend(list);

  dataList.forEach(item => {
    if (item.toLowerCase().startsWith(value.toLowerCase())) {
      const itemDiv = document.createElement("li");
      itemDiv.innerHTML = `<button class="dropdown-item" type="button"><strong>${item.substr(0, value.length)}</strong>${item.substr(value.length)}</button>`;
      itemDiv.addEventListener("click", function() {
        input.value = item;
        closeAllLists();
      });
      list.appendChild(itemDiv);
    }
  });

  if (list.children.length === 0) {
    closeAllLists();
  }
});

input.addEventListener("keydown", function(e) {
  let items = document.querySelectorAll(".autocomplete-item");
  if (!items) return;

  if (e.key === "ArrowDown") {
    // move down
    currentFocus++;
    addActive(items);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    // move up
    currentFocus--;
    addActive(items);
    e.preventDefault();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentFocus > -1) {
      if (items[currentFocus]) items[currentFocus].click();
    } else sendBtn.click();
  } else if (e.key === "Tab") {
    // tab selects first item if available
    if (items.length > 0) {
      input.value = items[0].innerText;
      closeAllLists();
      e.preventDefault();
    }else{
        input.value=input.placeholder;
        closeAllLists();
    }
  }
});

function addActive(items) {
  if (!items) return false;
  removeActive(items);
  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;
  items[currentFocus].classList.add("autocomplete-active");
}
function scrollToLastMessage() {
    document.querySelector('main').scrollTop = document.querySelector('main').scrollHeight;
}


// Helper: update share URL input
function updateShareUrl(chat) {
  const url = new URL(window.location.href);
  url.searchParams.set('chat', chat);
  shareUrlInput.value = url.toString();
}

// Switch to a chat: detach old listeners, attach to new messages node
function setChat(chatId) {
  if (!chatId) chatId = 'mainlobby';
  currentChat = chatId;
  if (messages) {
    try { messages.map().off(); } catch (e) {}
  }
  messages = gun.get('pr-inces-sbride-chat-' + chatId).get('messages');
  loadMessages();
  updateShareUrl(chatId);
  document.getElementById("room-title").innerText = chatId;
  // update URL without reloading
  try { history.replaceState(null, '', '?chat=' + encodeURIComponent(chatId)); } catch (e) {}
}

function removeActive(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].classList.remove("autocomplete-active");
  }
}

function closeAllLists() {
  const items = document.getElementsByClassName("dropdown-menu");
  for (let i = 0; i < items.length; i++) {
    items[i].parentNode.removeChild(items[i]);
  }
  currentFocus = -1;
}

document.addEventListener("click", function(e) {
  closeAllLists();
});


  // Sign up
  signupBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return alert('Enter username & password');

    gun.user().create(user, pass, ack => {
      if (ack.err) return alert('Error: ' + ack.err);
      alert('Account created! Now log in.');
    });
  });

  // Login
  loginBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return alert('Enter username & password');

    gun.user().auth(user, pass, ack => {
      if (ack.err) return alert('Login failed: ' + ack.err);

      currentUser = gun.user();
      // cache alias for suppressing self-notifications
      currentUser.get('alias').once(a => { currentAlias = a; });
      loginOpener.style.display = 'none';
      inputDiv.style.display = 'flex';
      loginModal.hide();
      // attach messages listener for the current chat (ensures single listener)
      setChat(currentChat);
    });
  });

  // Send message
  sendBtn.addEventListener('click', () => {
    const text = dataList.indexOf(msgInput.value.trim());
    if (text<0 || !currentUser) {alert('you must only use text from the princess bride movie script to continue'); return};

    // Add username to message
    currentUser.get('alias').once(alias => {
      messages.set({ user: alias || 'Anonymous', text, time: Date.now() });
      msgInput.value = '';
    });
  });

  // Load messages: attach a single listener and clear previous one
  function loadMessages() {
    
    // detach previous listener from previous messages node
    if (prevMessages && currentListener) {
      try { prevMessages.map().off(currentListener); } catch (e) {}
    }
    messagesDiv.innerHTML = '';
    // reset rendered keys for this chat
    renderedKeys = new Set();
    prevMessages = messages;
    currentListener = function(msg) {
      if (!msg) return;
      const key = ((msg.user||'') + '|' + (msg.time||'') + '|' + (msg.text||'')).toString();
      if (renderedKeys.has(key)) return;
      renderedKeys.add(key);
      const div = document.createElement('div');

      div.classList.add('message', msg.user === currentAlias ? 'outgoing' : 'incoming');

      const time = msg.time ? new Date(msg.time).toLocaleTimeString().toLowerCase() : '--';
      // msg.text is intended to be an index into dataList. Parse and lookup safely.
      let displayText = '';
      const idx = parseInt(msg.text, 10);
      if (!isNaN(idx) && dataList && dataList.length > idx) {
        displayText = dataList[idx];
      } else if (typeof msg.text === 'string' && msg.text.length > 0) {
        // fallback: show raw text (index or string)
        displayText = msg.text;
      } else {
        displayText = '[unknown message]';
      }
      div.textContent = `[${time}] ${msg.user}: ${displayText}`;

      div.innerHTML = `
        <img src="https://api.dicebear.com/9.x/thumbs/svg?seed=${msg.user}" alt="${msg.user}'s profile picture" class="avatar" draggable="false" />
        <div class="side">
          <span><b>${msg.user}</b> <i>at ${time}</i></span>
          <p>${displayText}</p>
        </div>
      `;

      messagesDiv.appendChild(div);
      scrollToLastMessage();
      lastMessage = msg;
      try {
        if (notificationsEnabled && msg.user && msg.user && old!==lastMessage && msg.user!==currentAlias) {
          old=lastMessage;
          audio.play().then(() => {
            console.log('notification played');
          }).catch(err => {
            console.warn('audio play failed', err);
          });
        }
      } catch(e) { console.warn('notify error', e); }
      // set autocomplete placeholder to next quote if available
      try {
        if (!isNaN(idx) && dataList && dataList.length > (idx+1)) input.placeholder = dataList[idx+1];
      } catch (e) {}
    };
    if (messages && messages.map) messages.map().on(currentListener);
  }
  // Optional: auto-logout after refresh
  gun.user().recall({ sessionStorage: true }, ack => {
    if (!ack.err && ack.sea) {
      currentUser = gun.user();
      // cache alias for suppressing self-notifications
      currentUser.get('alias').once(a => { currentAlias = a; });
      loginDiv.style.display = 'none';
      inputDiv.style.display = 'flex';
      // attach messages listener via setChat to avoid duplicate listeners
      setChat(currentChat);
    }
  });

// Chat list population and join handling
function addChatToSelect(chat) {
  if (!chat) return;
  // avoid duplicate options
  for (let i = 0; i < roomSelect.children.length; i++) {
    if (roomSelect.children[i].value === chat) return;
  }
  const opt = document.createElement('button');
  opt.classList.add("btn", `btn-${darkMode ? 'dark' : 'light'}`)
  opt.value = chat;
  opt.innerText = chat;
  opt.addEventListener("click", (e) => {
    setChat(e.target.value);
  })
  roomSelect.appendChild(opt);
}

// populate chats from Gun
gun.get('chat-list').map().on((v,k) => {
  if (!v) return;
  addChatToSelect(v);
});

// also load from localStorage fallback
try {
  const stored = JSON.parse(localStorage.getItem('known-chats')||'[]');
  stored.forEach(addChatToSelect);
} catch(e){}

joinBtn.addEventListener('click', () => {
  const chat = chatNameInput.value.trim() || currentChat;
  if (!chat) return alert('Enter chat name');
  gun.get('chat-list').set(chat);
  // persist locally for fallback
  try {
    const s = JSON.parse(localStorage.getItem('known-chats')||'[]');
    if (!s.includes(chat)) { s.push(chat); localStorage.setItem('known-chats', JSON.stringify(s)); }
  } catch(e){}
  addChatToSelect(chat);
  setChat(chat);
});

chatNameInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase().trim();
    const options = roomSelect.children;
    let validOptions = 0;

    for (const o of options) {
        const room = o.value;

        if (!room || !room.toLowerCase().includes(query)) {
            o.classList.add('d-none');
        } else {
            o.classList.remove('d-none');
            validOptions++;
        }
    }

    if (validOptions === 0) {
        joinBtn.classList.remove('d-none');
    }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    alert('Copied URL to clipboard');
  } catch (e) {
    prompt('Copy this URL', shareUrlInput.value);
  }
});

// initialize chat on load
setChat(currentChat);
updateShareUrl(currentChat);
