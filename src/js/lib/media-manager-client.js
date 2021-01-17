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

import otherWindowIPC from 'other-window-ipc';
import debug from './debug';
import bind from './bind';
import {urlFromFilename} from './utils';

// Keeps track of which images/videos can be displayed
// For files that are local it just always returns they exist
// For archives though they only exist if the corresponding blob exists
//
// One question is should we maintain a cache on this side?
//
// Two ideas
//
// 1.  State on server
//
//     Always ask server for file (if blob)
//
//     Server keeps list
//
// 2.  State on client
//
//     Server just loads blobs and then tells client
//     about all blobs added/removed
//
//     Client then asks itself
let g_clientCount = 0;

class MediaManagerClient {
  constructor() {
    this._msgId = 0;
    this._requests = {};
    this._logger = debug('MediaManagerClient', ++g_clientCount);
    bind(
      this,
      '_handleMediaStatus',
    );

    this._logger('registerMediaManager');
    this._streamP = otherWindowIPC.createChannelStream('mediaManager');
    this._streamP.then((stream) => {
      this._logger('got stream');
      this._stream = stream;
      stream.on('mediaStatus', this._handleMediaStatus);
    }).catch((err) => {
      console.error(err);
    });
  }

  requestMedia(info, callback) {
    this._logger('requestMedia:', JSON.stringify(info));
    this._streamP.then(() => {
      if (info.archiveName) {
        const requestId = ++this._msgId;
        this._requests[requestId] = callback;
        this._stream.send('getMediaStatus', requestId, info.filename);
      } else {
        process.nextTick(() => {
          callback(undefined, {
            url: urlFromFilename(info.filename),
            type: info.type,
          });
        });
      }
    });
  }

  _handleMediaStatus(requestId, error, blobInfo) {
    this._logger('mediaStatus:', requestId, error, JSON.stringify(blobInfo));
    const callback = this._requests[requestId];
    if (!callback) {
      throw new Error(`no callback for requestId: ${requestId}`);
    }
    delete this._requests[requestId];
    callback(error, blobInfo);
  }

  close() {
    this._logger('close');
    if (this._stream) {
      this._stream.close();
      this._stream = null;
    }
  }
}

export {
  MediaManagerClient as default,
};

