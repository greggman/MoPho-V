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
import debug from '../../lib/debug';
import bind from '../../lib/bind';
import {createBasename} from '../../lib/utils';

const s_saveDebounceDuration = 2000;
const s_folderVersion = 6;

function assert(cond, ...msg) {
  if (!cond) {
    throw new Error([...msg].join(' '));
  }
}

function convertVersion1To2OrThrow(data) {
  assert(data.version === 1);
  // only bad if archive data
  for (const fileInfo of Object.values(data.files)) {
    if (fileInfo.archiveName) {
      throw new Error('archives need new data from version 1');
    }
  }
  return {...data, version: 2};
}

function convertVersion2To3OrThrow(data) {
  assert(data.version === 2);
  // only bad if archive data
  for (const fileInfo of Object.values(data.files)) {
    if (fileInfo.thumbnail) {
      Object.assign(fileInfo.thumbnail, {
        pageSize: 2048,
      });
    }
  }
  return {...data, version: 3};
}

function convertVersion3To4OrThrow(data) {
  assert(data.version === 3);
  // only bad thumbnail.height < 1
  for (const fileInfo of Object.values(data.files)) {
    if (fileInfo.thumbnail && !(fileInfo.thumbnail.height > 0)) {
      throw new Error('bad thumbnail');
    }
  }
  return {...data, version: 4};
}

function convertVersion4To5OrThrow(data, folderPath) {
  assert(data.version === 4);
  data.folderPath = folderPath;
  return {...data, version: 5};
}

function convertVersion5To6OrThrow(data) {
  assert(data.version === 5);
  if (!data.scannedTime) {
    data.scannedTime = Date.now();
  }
  return {...data, version: 6};
}

const versionConverters = {
  '1': convertVersion1To2OrThrow,
  '2': convertVersion2To3OrThrow,
  '3': convertVersion3To4OrThrow,
  '4': convertVersion4To5OrThrow,
  '5': convertVersion5To6OrThrow,
};

class FolderData {
  constructor(filepath, options) {
    this._logger = debug('FolderData', filepath);
    this._filepath = filepath;
    this._fs = options.fs;
    bind(
      this,
      '_save',
    );
    if (options.readOnly) {
      this._save = () => {};
    }
    this._fileExists = false;
    this._baseFilename = createBasename(options.dataDir, 'folder', this._filepath);
    this._jsonFilename = `${this._baseFilename}.json`;
    this._data = {
      version: s_folderVersion,
      folderPath: filepath,
      files: {},
    };
    this._queueWrite = _.debounce(this._save, s_saveDebounceDuration);  // save if we haven't added anyhting in 1 second
    this._logger('checking:', this._jsonFilename);
    if (this._fs.existsSync(this._jsonFilename)) {
      this._logger('read:', this._jsonFilename);
      try {
        const json = this._fs.readFileSync(this._jsonFilename, {encoding: 'utf8'});
        this._fileExists = true;
        let data = JSON.parse(json);
        while (data.version !== s_folderVersion) {
          const converter = versionConverters[data.version];
          if (!converter) {
            throw new Error('bad version');
          }
          data = converter(data, filepath);
          this._queueWrite();
        }
        this._data = data;
      } catch (e) {
        console.error('could not read:', this._jsonFilename, e);
        this._queueWrite();
      }
    }
  }
  get files() {
    return this._data.files;
  }
  get baseFilename() {
    return this._baseFilename;
  }
  get scannedTime() {
    return this._data.scannedTime;
  }
  get exists() {
    return this._fileExists;
  }
  deleteData() {
    if (this._fileExists) {
      // should I trap this?
      try {
        this._fs.unlinkSync(this._jsonFilename);
      } catch (e) {
        this._logger.error(e);
      }
    }
    this._save = () => {};
  }
  _save() {
    this._logger('writing:', this._jsonFilename);
    this._fs.writeFileSync(
      this._jsonFilename,
      JSON.stringify(this._data, null, 2),
      'utf8',
    );
    this._fileExists = true;
  }
  addFiles(files) {
    let changed = false;
    for (const [filePath, fileInfo] of Object.entries(files)) {
      if (!_.isEqual(this._data.files[filePath], fileInfo)) {
        changed = true;
        this._data.files[filePath] = fileInfo;
      }
    }
    if (changed) {
      this._queueWrite();
    }
  }
  setScannedTime() {
    this._data.scannedTime = Date.now();
    this._queueWrite();
  }
  removeFiles(filepaths) {
    let changed = false;
    for (const filepath of filepaths) {
      if (this._data.files[filepath]) {
        changed = true;
        delete this._data.files[filepath];
      }
    }
    if (changed) {
      this._queueWrite();
    }
  }
}

export {
  FolderData as default,
};
