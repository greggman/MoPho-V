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
import _ from 'lodash';
import path from 'path';

function addFileMetaData(files) {
  for (const [filename, fileInfo] of Object.entries(files)) {
    Object.assign(fileInfo, {
      baseName: path.basename(filename).toLowerCase(),
      folderName: path.dirname(filename).toLowerCase(),
      lowercaseName: fileInfo.displayName.toLowerCase(),
    });
  }
}

// This is basically just a receptical for all the data
// from the Thumber. We don't really need this. We
// could just ask the Thumber to send all the data again
// but for some reason it seems since to store the data
// locally.
class FolderDB extends EventEmitter {
  constructor() {
    super();
    this._folders = {};
    this._totalFiles = 0;
    this._newFolders = {};
    this._processNewFolders = _.throttle(this._processNewFolders.bind(this), 1500);
  }
  get totalFiles() {
    return this._totalFiles;
  }

  updateFiles(folders) {
    Object.assign(this._newFolders, folders);
    this._processNewFolders();
  }

  _processNewFolders() {
    const folders = this._newFolders;
    this._newFolders = {};
    for (const [folderName, folder] of Object.entries(folders)) {
      folder.files = folder.files || {};
      folder.status = folder.status || {};
      const files = folder.files;
      const status = folder.status;
      addFileMetaData(files);
      const oldFolder = this._folders[folderName];
      if (oldFolder) {
        this._totalFiles -= Object.keys(oldFolder.files).length;
      }
      if (_.isEmpty(files) && !status.scanning && !status.checking) {
        delete this._folders[folderName];
      } else {
        this._folders[folderName] = folder;
      }
      this._totalFiles += Object.keys(files).length;
    }
    this.emit('updateFiles', folders);
  }
  sendAll() {
    process.nextTick(() => {
      this.emit('updateFiles', this._folders);
    });
  }
  getAllChildren(parentFolderName) {
    const children = [];
    for (const [folderName, folder] of Object.entries(this._folders)) {
      if (folderName.startsWith(parentFolderName)) {
        if (folderName !== parentFolderName) {
          children.push(folderName);
        }
        children.push(...Object.keys(folder.files));
      }
    }
    return children;
  }
}

export {
  FolderDB as default,
};
