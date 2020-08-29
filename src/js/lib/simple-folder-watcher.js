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
import path from 'path';
import ListenerManager from './listener-manager';
import debug from './debug';
import bind from './bind';
import ResetableTimeout from './resetable-timeout';

function shallowCopy(src) {
  const dst = {};
  Object.keys(src).forEach((key) => {
    dst[key] = src[key];
  });
  return dst;
}

// Should I add option to normalize path (as in always '/' never '\'?

class SimpleFolderWatcher extends EventEmitter {
  constructor(filePath, options) {
    super();
    bind(
      this,
      '_handleCreate',
      '_handleChange',
      '_handleRemove',
      '_handleError',
      '_sendEnd',
      '_sendEndAfterTimeout',
    );
    const opt = shallowCopy(options || {});
    opt.addOrCreate = opt.addOrCreate || 'add';
    this._fs = opt.fs;
    this._logger = debug('SimpleFolderWatcher', filePath);
    this._entries = new Map();
    this._filePath = filePath;
    this._options = opt;
    this._filter = opt.filter || this._pass;
    this._listenerManager = new ListenerManager();

    process.nextTick(() => {
      this._start(opt.watcherFactory);
    });
  }

  close() {
    if (this._closed) {
      return;
    }
    this._listenerManager.removeAll();
    this._watcher.close();
    this._watcher = null;
    // I hope there's no queued events.
    this._entries = null;
    this._closed = true;
  }

  refresh() {
    if (!this._closed) {
      this._scan('create');
    }
  }

  _start(watcherFactory) {
    // because this is async we might be closed before this fires
    if (this._closed) {
      return;
    }
    this._watcher = watcherFactory(this._filePath, this._options);
    const on = this._listenerManager.on.bind(this._listenerManager);
    on(this._watcher, 'create', this._handleCreate);
    on(this._watcher, 'change', this._handleChange);
    on(this._watcher, 'remove', this._handleRemove);
    on(this._watcher, 'error', this._handleError);
    this._scan(this._options.addOrCreate);
  }

  _handleChange(filepath) {
    this._onChange('change', path.basename(filepath));
  }

  _handleCreate(filepath) {
    this._onChange('create', path.basename(filepath));
  }

  _handleRemove(filepath) {
    this._onChange('remove', path.basename(filepath));
  }

  _sendEnd() {
    this._logger('end');
    this.emit('end');
  }

  _sendEndAfterTimeout() {
    this._timeout = this._timeout || new ResetableTimeout(this._sendEnd, 250);
    this._timeout.reset();
  }

  _onChange(event, filename) {
    this._logger('ONCHANGE:', event, filename);
    this._checkFile(filename, undefined, this._sendEndAfterTimeout);
  }

  // TODO add this back in?
  _handleError(err) {
    this._logger('ONERROR:', this._filePath);
    // not really sure what errors to check for here
    if (err && err.code === 'EPERM') {
      this._removeAll();
    } else {
      throw err;
    }
  }

  _scan(addOrCreate) {
    if (this._scanning) {
      return;
    }
    this._scanning = true;
    this._fs.readdir(this._filePath, (err, fileNames) => {
      this._scanning = false;
      // because this is async we might be closed when this fires
      if (this._closed) {
        return;
      }
      if (err) {
        this.emit('error', `error ${err}: ${this._filePath}`);
      } else {
        const validFileNames = fileNames.filter((fileName) => this._filter(path.join(this._filePath, fileName)));
        // Check removed
        this._entries.forEach((state, entryPath) => {
          if (validFileNames.indexOf(entryPath) < 0) {
            this.emit('remove', entryPath);
          }
        });


        let numToComplete = validFileNames.length + 1;
        const sendEndIfFinished = () => {
          --numToComplete;
          if (numToComplete === 0) {
            this._sendEnd();
          }
        };
        validFileNames.forEach((fileName) => {
          this._checkFile(fileName, addOrCreate, sendEndIfFinished);
        });
        sendEndIfFinished();
      }
    });
  }

  _checkFile(fileName, addOrCreate = 'create', callback = () => {}) {
    this._logger('_checkFile', fileName);
    // how am I getting here if this is done? Looks like I'm getting notification for self.?
    if (this._closed) {
      this._logger('_checkFile called after closed!??!');
      callback(true);
      return;
    }
    const fullPath = path.join(this._filePath, fileName);
    if (!this._filter(fullPath)) {
      this._logger('filtered out:', fullPath);
      callback(true);
      return;
    }
    this._fs.stat(fullPath, (err, stats) => {
      // Because this is async we might be closed when this gets back
      if (this._closed) {
        callback(true);
        return;
      }
      const oldStats = this._entries.get(fileName);
      if (err) {
        // TODO: check for type of error?
        if (oldStats) {
          this._entries.delete(fileName);
          this._logger('emit remove:', fullPath);
          this.emit('remove', fullPath, oldStats);
        }
        callback(true);
      } else {
        this._entries.set(fileName, stats);
        if (oldStats) {
          if (oldStats.size !== stats.size ||
              oldStats.mtime !== stats.mtime) {
            this._logger('emit change:', fullPath);
            this.emit('change', fullPath, stats, oldStats);
          }
        } else {
          this._logger('emit', addOrCreate, ':', fullPath);
          this.emit(addOrCreate, fullPath, stats);
        }
        callback(false);
      }
    });
  }

  _removeAll() {
    this._logger('REMOVEALL:', this._filePath);
    if (this._closed) {
      return;
    }
    this._entries.forEach((stats, fileName) => {
      this.emit('remove', path.join(this._filePath, fileName), stats);
    });
    this._sendEnd();
    this.close();
  }

  _pass() {
    return true;
  }
}

export {
  SimpleFolderWatcher as default,
};

