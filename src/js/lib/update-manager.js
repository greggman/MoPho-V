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

import {ipcMain} from 'electron';  // eslint-disable-line
import {autoUpdater} from 'electron-updater';

let g_webContent;
let g_checkDate;

[
  'error',
  'checking-for-update',
  'update-available',
  'update-not-available',
  'update-downloaded',
  'download-progress',
].forEach((event) => {
  autoUpdater.on(event, (...args) => {
    if (g_webContent) {
      g_webContent.send(event, ...args);
    } else {
      console.error('no window for event:', event);
    }
  });
});

ipcMain.on('checkForUpdate', (e) => {
  g_webContent = e.sender;
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    g_webContent.send('error', e.toString());
  }
});

ipcMain.on('quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('checkedForUpdate', () => {
  g_checkDate = Date.now();
});

function getUpdateCheckDate() {
  return g_checkDate;
}

export {
  getUpdateCheckDate,  // eslint-disable-line
};
