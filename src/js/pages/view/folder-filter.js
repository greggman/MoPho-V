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

import EventEmitter from 'events';
import {performance} from '../../lib/perf';

// Emits:
//   pending: there is more data. Start processing
//   updateFiles: just like thumber
//
// Anytime `'pending'` arrives start calling `process`
// until it returns false.
class FolderFilter extends EventEmitter {
  constructor(processTimeMs = 5) {
    super();
    this._pendingFolders = [];
    this._filter = null;
    this._processTimeMs = processTimeMs;
    this._cancelHelper = {
      cancelled: false,
    };
  }
  updateFiles(folders) {
    for (const [folderName, folder] of Object.entries(folders)) {
      const ndx = this._pendingFolders.findIndex((pending) => {
        return pending.folderName === folderName;
      });
      if (ndx >= 0) {
        this._pendingFolders.splice(ndx, 1);
      }
      this._pendingFolders.push({
        folderName,
        folder,
      });
    }
    process.nextTick(() => {
      this.emit('pending');
    });
  }
  setFilter(filter) {
    this._cancelHelper.cancelled = true;
    this._cancelHelper = {
      cancelled: false,
    };
    this._filter = filter;
    this._pendingFolders = [];
    this._currentFolder = undefined;
    this._currentFiles = undefined;
    this._currentFolderName = undefined;
    this._outFiles = {};
  }
  process() {
    const startTimeMs = performance.now();
    for (;;) {
      if (!this._currentFiles) {
        if (!this._pendingFolders.length) {
          return false;
        }
        const folderInfo = this._pendingFolders.shift();
        this._outFolder = {};
        this._currenFolder = folderInfo.folder;
        this._currentFolderName = folderInfo.folderName;
        this._currentFiles = Object.entries(folderInfo.folder.files);
      } else if (this._currentFiles.length) {
        const file = this._currentFiles.pop();
        const filename = file[0];
        const fileInfo = file[1];
        if (this._filter(filename, fileInfo)) {
          this._outFiles[filename] = fileInfo;
        }
      } else {
        const folder = this._currenFolder;
        const folderName = this._currentFolderName;
        const files = this._outFiles;
        this._currentFolder = undefined;
        this._currentFolderName = undefined;
        this._outFiles = {};
        this._currentFiles = undefined;
        this._sendFolder(folderName, {
          status: folder.status,
          files,
        });
      }
      const elapsedTimeMs = performance.now() - startTimeMs;
      if (elapsedTimeMs >= this._processTimeMs) {
        break;
      }
    }
    return true;
  }
  _sendFolder(folderName, folder) {
    const cancelHelper = this._cancelHelper;
    const folders = {};
    folders[folderName] = folder;

    // Should we emit immediately or wait?
    // Advantage to immediate is time to process
    // result is included in our time budget.
    // Advantage to wait is we don't have to
    // worry about event loops.
    process.nextTick(() => {
      if (!cancelHelper.cancelled) {
        this.emit('updateFiles', folders);
      }
    });
  }
}

export {
  FolderFilter as default,
};
