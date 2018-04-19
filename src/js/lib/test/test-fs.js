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

import temp from 'temp';  // eslint-disable-line
import fs from 'fs';
import path from 'path';
import debug from '../debug';
import * as testCleanup from './test-cleanup';

// we can add other functions later
class TestFS {
  constructor(_fs) {
    this._fs = _fs || fs;
    this._baseFilename = path.normalize(path.resolve(temp.path()));
    this._logger = debug('TestFS', this._baseFilename);
    this._files = {};
    this._folders = {};

    const api = {
      _files: [ 'writeFile', 'writeFileSync', ],
      _folders: [ 'mkdir', 'mkdirSync', ],
    };
    for (const [type, funcNames] of Object.entries(api)) {
      for (const funcName of funcNames) {
        this[funcName] = this._makeWrapper(type, funcName);
      }
    }
    for (const key in this._fs) {
      if (!this[key]) {
        const val = this._fs[key];
        if (typeof val === 'function') {
          this[key] = val.bind(this._fs);
        } else {
          this[key] = val;
        }
      }
    }

    this._fs.mkdirSync(this._baseFilename);
    this.close = this.close.bind(this);
    testCleanup.register(this.close);
  }
  get baseFilename() {
    return this._baseFilename;
  }
  _isChild(filename) {
    // NOTE: this check is case sensitive so it won't handle the case if
    // baseFilename has a different case BUT it's unlikely users will manipulate
    // paths below that so?!???
    return path.normalize(path.resolve(filename)).startsWith(this._baseFilename);
  }
  _makeWrapper(type, funcName) {
    return (filename, ...args) => {
      if (this._isChild(filename)) {
        this._logger(funcName, filename);
        this[type][filename] = true;
      }
      return this._fs[funcName].call(this._fs, filename, ...args);
    };
  }
  close() {
    if (this._fs) {
      testCleanup.unregister(this.close);
      for (const filename of Object.keys(this._files)) {
        try {
          this._fs.unlinkSync(filename);
        } catch (e) {
          //
        }
      }
      for (const filename of Object.keys(this._folders)) {
        try {
          this._fs.rmdirSync(filename);
        } catch (e) {
          //
        }
      }
      this._fs.rmdirSync(this._baseFilename);
      this._fs = undefined;
    }
  }
}

export {
  TestFS as default,
};
