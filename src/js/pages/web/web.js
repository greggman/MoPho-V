import * as happyfuntimes from 'happyfuntimes/dist/hft';

const $ = document.querySelector.bind(document);
const passwordUI = $('.password');
const passwordForm = $('.password form');
const passwordElem = $('.password input[type=password]');
let password;
let triedOnce = false;

passwordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  triedOnce = true;
  const tempPass = passwordElem.value.trim();
  password = tempPass.length ? tempPass : undefined;
  login();
});

const client = new happyfuntimes.GameClient();
// I have no idea what I'm doing here or where to look up best
// practices. I can't do HTTPS because certs for ip addresses
// I don't want random person at coffeeshop to see list
// of files so I want to prevent them logging in. Not really
// sure what to do.
// Suppose I could encrypt data on websocket but seems like
// overkill for now. Submit a PR if you have ideas
client.on('connect', login);

// send: login, { }
// response: `login`, { needPassword: bool }
// send: `login`, { password: "..." }

function login() {
  client.sendCmd('login', {password});
}

function showPassword() {
  passwordForm.className = triedOnce ? 'error' : '';
  passwordUI.style.display = 'block';
  passwordElem.focus();
}

function hidePassword() {
  triedOnce = false;
  passwordUI.style.display = 'none';
}

client.on('login', (data) => {
  if (data.needPassword) {
    // show password dialog
    showPassword();
  } else {
    // we logged in
    hidePassword();
  }
});

client.on('disconnect', () => {
  console.log('disconnected');
});

client.on('updateFiles', (data) => {
  log('updateFiles', JSON.stringify(data, null, 2));
  const seen = {};
  for (const folder of Object.values(data)) {
    for (const fileInfo of Object.values(folder.files)) {
      if (fileInfo.bad || fileInfo.archiveName) {
        return;
      }
      const url = fileInfo.thumbnail && fileInfo.thumbnail.url;
      if (url && !seen[url]) {
        seen[url] = true;
        const img = new Image();
        img.src = url;
        img.width = '256';
        document.body.appendChild(img);
      }
      {
        const img = new Image();
        img.src = fileInfo.url;
        img.width = '256';
        document.body.appendChild(img);
      }
    }
  }
});

function log(...args) {
  const elem = document.createElement('pre');
  elem.textContent = [...args].join(' ');
  document.body.appendChild(elem);
}

