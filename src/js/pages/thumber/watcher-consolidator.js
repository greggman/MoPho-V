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

import bind from '../../lib/bind';
import debug from '../../lib/debug';
import SimpleFolderWatcher from '../../lib/simple-folder-watcher';
import ListenerManager from '../../lib/listener-manager';

const s_sendDebounceDuration = 1000;

function statToFileInfo(stat) {
  return {
    size: stat.size,
    mtime: stat.mtimeMs,
    isDirectory: stat.isDirectory(),
  };
}

// Wrapper SimpleFolderWatcher. emits ALL files
class WatcherConsolidator extends EventEmitter {
  constructor(filepath, watcherFactory, fs) {
    super();
    this._filepath = filepath;
    this._logger = debug('WatcherConsolidator', filepath);
    this._watcher = new SimpleFolderWatcher(filepath, {
      watcherFactory: watcherFactory,
      fs: fs,
    });
    bind(
      this,
      '_addFile',
      '_changeFile',
      '_removeFile',
      '_end',
      '_send',
      '_error',
    );
    this._queueSend = function noop() {};
    this._files = {};
    this._listenerManager = new ListenerManager();
    const on = this._listenerManager.on.bind(this._listenerManager);
    on(this._watcher, 'add', this._addFile);
    on(this._watcher, 'create', this._addFile);
    on(this._watcher, 'change', this._changeFile);
    on(this._watcher, 'remove', this._removeFile);
    on(this._watcher, 'end', this._end);
    on(this._watcher, 'error', this._error);
  }
  close() {
    this._listenerManager.removeAll();
    this._watcher.close();
  }
  refresh() {
    this._watcher.refresh();
  }
  _send() {
    this.emit('files', this._files);
  }
  _addFile(filePath, stat) {
    this._logger('addFile:', filePath);
    this._files[filePath] = statToFileInfo(stat);
    this._queueSend();
  }
  _changeFile(filePath, stat) {
    this._logger('changeFile:', filePath);
    this._files[filePath] = statToFileInfo(stat);
    this._queueSend();
  }
  _removeFile(filePath /* , stat */) {
    this._logger('removeFile:', filePath);
    delete this._files[filePath];
    this._queueSend();
  }
  _end() {
    this._logger('end');
    this._send();
    this._queueSend = _.throttle(this._send, s_sendDebounceDuration);  // send if we haven't added anyhting in 1 second
  }
  _error() {
    // does this matter?
    this._end();  // send. If we got an error on start this will mean no files which seems like what we want.
  }
}

export {
  WatcherConsolidator as default,
};

