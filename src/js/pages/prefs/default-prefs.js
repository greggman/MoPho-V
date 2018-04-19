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

import _ from 'lodash';
import hjson from 'hjson';

const s_prefsVersion = 2;

const defaultPrefs = {
  version: s_prefsVersion,
  folders: [],
  thumbnails: {
    scanSize: 150,
  },
  misc: {
    stepForwardDuration: 10,
    stepBackwardDuration: 5,
    fullPathOnSeparator: true,
    indentByFolderDepth: false,
    scanContinuously: true,
    showThumber: true,
    showBad: false,
    filterSmallImages: true,
    toolbarPosition: 'swapBottom',
    password: '',
    checkForUpdates: true,
    showDates: false,
    showDimensions: false,
    promptOnDeleteFile: true,
    promptOnDeleteFolder: true,
  },
  slideshowDuration: {
    'image': 5,
    'image/gif': 10,
    'video': 30,
    // note: this is not currently used.
    // The idea is if new formats were added via plugins
    // they'd get this duration by default.
    'default': 5,
  },
  keyConfig: [
    { keyCode:  27, action: 'closeViewer', },  // esc
    { keyCode: 112, action: 'zoomIn', },  // F1
    { keyCode: 113, action: 'zoomOut', },  // F2
    { keyCode:  76, action: 'setLoop', },
    { keyCode:  16, modifiers: 's', action: 'gotoPrev', }, // left-shift
    { keyCode: 219, action: 'gotoPrev', },  // [
    { keyCode:  17, modifiers: 'c', action: 'gotoNext', },  // left control
    { keyCode: 221, action: 'gotoNext', },  // ]
    { keyCode: 220, action: 'gotoNext', },  // \|
    { keyCode:  80, action: 'togglePlay', }, // p
    { keyCode:   9, action: 'fastForward', },   // tab
    { keyCode:  81, action: 'fastForward', },   // q
    { keyCode:  39, action: 'fastForward', },   // right
    { keyCode:  37, action: 'fastBackward', },  // left
    { keyCode: 192, action: 'fastBackward', },  // tilda
    { keyCode:  87, action: 'fastBackward', },  // w
    { keyCode:  38, action: 'scrollUp', },  // up
    { keyCode:  40, action: 'scrollDown', },  // down
    { keyCode:  49, action: 'setPlaybackSpeed1', },  // 1  1
    { keyCode:  50, action: 'setPlaybackSpeed2', },  // 2  0.66
    { keyCode:  51, action: 'setPlaybackSpeed3', },  // 3  0.5
    { keyCode:  52, action: 'setPlaybackSpeed4', },  // 4  0.33
    { keyCode:  53, action: 'setPlaybackSpeed5', },  // 5  0.25
    { keyCode:  83, action: 'toggleSlideshow', }, // S
    { keyCode: 191, action: 'rotate', },  // /  rotate
    { keyCode:  65, action: 'rotate', },  // a  rotate
    { keyCode:  88, action: 'rotate', },  // x  rotate
    { keyCode: 190, action: 'changeStretchMode', },  // . stretch
    { keyCode:  90, action: 'changeStretchMode', },  // z stretch
    { keyCode: 114, action: 'nextView', },  // F3
    { keyCode: 115, action: 'prevView', },  // F4
    { keyCode: 116, action: 'toggleUI', },  // F5
    { keyCode:  54, action: 'splitHorizontal', },  // F6
    { keyCode:  55, action: 'splitVertical', },  // F7
    { keyCode:  56, action: 'deletePane', },  // F8
    { keyCode: 122, action: 'toggleFullscreen', }, // F11
    { keyCode:  78, modifiers: 'm', action: 'newWindow', } // Cmd-M
  ],
};

function getPrefs(prefs) {
  if (!prefs) {
    return _.cloneDeep(defaultPrefs);
  }

  // add in missing prefs (if prefs is old)
  prefs = _.cloneDeep(prefs);
  for (const [topKey, topValue] of Object.entries(defaultPrefs)) {
    const midPrefs = prefs[topKey];
    if (!midPrefs) {
      prefs[topKey] = _.cloneDeep(topValue);
    } else if (!Array.isArray(topValue)) {
      for (const [midKey, midValue] of Object.entries(topValue)) {
        if (midPrefs[midKey] === undefined) {
          midPrefs[midKey] = midValue;
        }
      }
    }
  }

  return prefs;
}

function assert(cond, ...msg) {
  if (!cond) {
    throw new Error([...msg].join(' '));
  }
}

function convertVersion0To1OrThrow(prefs) {
  assert(prefs.version === undefined);
  _.defaults(prefs, defaultPrefs);
  _.defaults(prefs.misc, defaultPrefs.misc);
  prefs.version = 1;
  return prefs;
}

function convertVersion1To2OrThrow(prefs) {
  assert(prefs.version === 1);
  _.defaults(prefs, defaultPrefs);
  _.defaults(prefs.misc, defaultPrefs.misc);
  prefs.misc.toolbarPosition = prefs.misc.toolbarOnBottom ? 'bottom' : 'top';
  delete prefs.toolbarOnBottom;
  prefs.version = 2;
  return prefs;
}


const versionConverters = {
  '0': convertVersion0To1OrThrow,
  '1': convertVersion1To2OrThrow,
};

function loadPrefs(prefsPath, fs) {
  let error;
  let prefs;
  if (fs.existsSync(prefsPath)) {
    try {
      const str = fs.readFileSync(prefsPath, {encoding: 'utf8'});
      prefs = hjson.parse(str);
      while (prefs.version !== s_prefsVersion) {
        const converter = versionConverters[prefs.version || 0];
        if (!converter) {
          throw new Error('bad version');
        }
        prefs = converter(prefs);
      }
    } catch (e) {
      console.error('could not load prefs:', prefsPath, e);
      error = true;
    }
  }
  return {
    error,
    prefs: getPrefs(prefs),
  };
}

export {
  defaultPrefs,
  getPrefs,
  loadPrefs,
};
