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

import React from 'react';
import { render as reactRender } from 'react-dom';
import {configure} from 'mobx';

import {ipcRenderer} from 'electron';  // eslint-disable-line
import App from './app';
import stacktraceLog from '../../lib/stacktrace-log'; // eslint-disable-line
import '../../lib/title';

const isDevMode = process.env.NODE_ENV === 'development';

if (isDevMode) {
  configure({
    enforceActions: 'always',
  });

  const { remote } = require('electron');
  const { Menu, MenuItem } = remote;
  let rightClickPosition = null;

  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Inspect Element',
    click: () => {
      remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y)
    }
  }));

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.popup({ window: remote.getCurrentWindow() });
  }, false);

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    rightClickPosition = {x: e.x, y: e.y};
    menu.popup(remote.getCurrentWindow());
  }, false);
}

// we can print this value to see if code is getting executed on the same frame
window.frameCountNumber = 0;
function advanceFrame() {
  ++window.frameCountNumber;
  window.frameCount = `frame#${window.frameCountNumber}`;
  requestAnimationFrame(advanceFrame);
}

if (isDevMode) {
  requestAnimationFrame(advanceFrame);
}

function start(args, startState) {
  const g = {
    columnWidth: 160,
    padding: 10,
    maxSeekTime: 30,
    currentVPairNdx: 0,
  };

  setTimeout(() => {
    reactRender(
      <App options={g} startState={startState} />,
      document.querySelector('.browser')
    );
  }, isDevMode ? 1000 : 100);
}

ipcRenderer.on('start', (event, args, startState) => {
  start(args, startState);
});
ipcRenderer.send('start');

