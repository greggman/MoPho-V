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

import path from 'path';
import otherWindowIPC from 'other-window-ipc';
import debug from '../../lib/debug';
import * as archive from './archive';
import bind from '../../lib/bind';

class MediaClientProxy {
  constructor(id, stream) {
    this._id = id; // mostly for debugging
    this._stream = stream;
    this._logger = debug('MediaClientProxy', id);
    this._archiveName = null;
    this._requests = [];
    this._currentRequest = null;
    this._archiveFiles = {};
    this._archiveBlobUrlsByFilename = {};
    bind(
      this,
      '_sendMediaStatus',
      '_getMediaStatus',
      '_disconnect',
    );

    stream.on('getMediaStatus', this._getMediaStatus);
    stream.on('disconnect', this._disconnect);
  }

  close() {
    this._closeArchive();
  }

  _closeArchive() {
    if (this._archiveFiles) {
      Object.values(this._archiveBlobUrlsByFilename)
        .filter(e => e.url)
        .forEach(e => URL.revokeObjectURL(e.url));
    }
    this._archiveFiles = {};
    this._archiveName = null;
  }

  _disconnect() {
    this._logger('disconnect');
    this.close();
  }

  _getMediaStatus(requestId, filename) {
    this._logger('requestMedia: reqId:', requestId, 'filename:', filename);
    this._requests.push({
      requestId: requestId,
      archiveName: path.dirname(filename),
      filename: path.basename(filename),
    });
    this._processNextRequest();
  }

  async _sendMediaStatus() {
    const {requestId, archiveName, filename} = this._currentRequest;
    const blobInfo = this._archiveFiles[filename];
    let exception;
    if (blobInfo && !this._archiveBlobUrlsByFilename[filename]) {
      try {
        const blob = await blobInfo.blob();
        this._archiveBlobUrlsByFilename[filename] = URL.createObjectURL(blob);
      } catch (e) {
        exception = e;
      }
    }
    const error = exception
      ? `${exception} for: ${filename}`
      : blobInfo
        ? null :
        `no blobInfo for: ${filename}`;
    this._logger('sendMediaStatus: reqId:', requestId, 'archive:', archiveName, 'filename:', filename, 'error:', error);
    this._stream.send('mediaStatus', requestId, error, blobInfo ? {
      size: blobInfo.size,
      type: blobInfo.type,
      mtime: blobInfo.mtime,
      url: this._archiveBlobUrlsByFilename[filename],
    } : undefined);
    this._currentRequest = null;
    this._processNextRequest();
  }

  async _processNextRequest() {
    this._logger('processNextRequest');
    if (this._currentRequest || this._requests.length === 0) {
      return;
    }

    this._currentRequest = this._requests.shift();
    const request = this._currentRequest;
    if (this._archiveName === request.archiveName) {
      this._sendMediaStatus();
      return;
    }
    // Sigh! Since it's all async I have no idea
    // if this is being used current. The hope
    // Since there's only 1 viewer this corresponds
    // to maybe it's okay? But if multiple things
    // are queued up then I'd need some kind of buffer
    this._logger('createDecompressor:', request.archiveName);
    this._closeArchive();
    this._archiveName = request.archiveName;

    try {
      this._archiveBlobUrlsByFilename = {};
      this._archiveFiles = await archive.createDecompressor(request.archiveName);
    } catch (e) {
      this._archiveFiles = {};
    }
    process.nextTick(this._sendMediaStatus);
  }
}

// Keeps track of MediaManagerClient
// Each client is allowed to have one archive opened at a time
class MediaManagerServer {
  constructor() {
    this._nextClientId = 1;
    this._logger = debug('MediaManagerServer');
    this._clients = [];
    this._logger('ctor');
    bind(
      this,
      '_handleRegisterMediaManager',
    );

    this._channelListener = otherWindowIPC.createChannel('mediaManager');
    this._channelListener.on('connect', this._handleRegisterMediaManager);
  }
  _handleRegisterMediaManager(stream) {
    const id = this._nextClientId++;
    this._logger('registerMediaManager: id =', id);
    const client = new MediaClientProxy(id, stream, this);
    this._clients.push(client);
    stream.on('disconnect', () => {
      const ndx = this._clients.indexOf(client);
      if (ndx >= 0) {
        this._clients.splice(ndx, 1);
      }
    });
  }
  close() {
    this._clients.slice().forEach((client) => {
      client.close();
    });
    this._channelListener.close();
  }
}

export {
  MediaManagerServer as default,
};
