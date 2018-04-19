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

import {shell, ipcRenderer, remote} from 'electron';  // eslint-disable-line
import path from 'path';
import '../../lib/title';

// const isDevMode = process.env.NODE_ENV === 'development';

function start(args) {
  const prefspath = path.join(args.userDataDir, 'prefs.json');
  const $ = document.querySelector.bind(document);
  $('#version').textContent = remote.app.getVersion();
  $('#exepath').textContent = process.argv[0];
  $('#prefspath').textContent = prefspath;
  $('#prefspath').addEventListener('click', () => {
    shell.showItemInFolder(prefspath);
  });
  document.querySelectorAll('[data-platform]').forEach((elem) => {
    if (elem.dataset.platform !== process.platform) {
      elem.style.display = 'none';
    }
  });
}

ipcRenderer.on('start', (event, args) => {
  start(args);
});
ipcRenderer.send('start');
