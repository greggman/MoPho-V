/*
Copyright 2018, Greggman.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials provided
      with the distribution.

    * Neither the name of Greggman. nor the names of their
      contributors may be used to endorse or promote products derived
      from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
import {remote, ipcRenderer} from 'electron';  // eslint-disable-line

const isOSX = process.platform === 'darwin';

const g_timeUntilMenuMs = 1000;
const g_menuAreaHeight = 2;

let timeoutId;
let menuShowing = true;

function checkMenu(e) {
  if (e.clientY <= g_menuAreaHeight) {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        showMenu();
      }, g_timeUntilMenuMs);
    }
  } else {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    hideMenu();
  }
}

function hideMenu(force) {
  if (menuShowing || force) {
    menuShowing = false;
    remote.getCurrentWindow().setMenu(null);
    remote.require('electron').Menu.setApplicationMenu(null);
  }
}

function showMenu() {
  if (!menuShowing) {
    menuShowing = true;
    ipcRenderer.send('setupMenus');
  }
}

function installFullscreenHandler(force) {
  if (!isOSX) {
    hideMenu(force);
    window.addEventListener('mousemove', checkMenu);
  }
}

function setupFullscreen() {
  const isFullscreen = remote.getCurrentWindow().isFullScreen();
  if (isFullscreen) {
    installFullscreenHandler(true);
  }
}

function enterFullscreen() {
  remote.getCurrentWindow().setFullScreen(true);
  // you can't remove the menus in OSX
  installFullscreenHandler();
}

function exitFullscreen() {
  remote.getCurrentWindow().setFullScreen(false);
  if (!isOSX) {
    window.removeEventListener('mousemove', checkMenu);
    showMenu();
  }
}

function toggleFullscreen() {
  const isFullscreen = remote.getCurrentWindow().isFullScreen();
  if (isFullscreen) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

export {
  setupFullscreen,
  toggleFullscreen,
};
