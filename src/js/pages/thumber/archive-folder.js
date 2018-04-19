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
import debug from '../../lib/debug';
import {getImagesAndVideos, getSeparateFilenames, deleteThumbnails} from './folder-utils';

class ArchiveFolder extends EventEmitter {
  constructor(filename, options) {
    super();
    this._logger = debug('ArchiveFolder', filename);
    this._logger('new ArchiveFolder');
    this._filename = filename;
    this._folderData = options.folderData;
    this._fs = options.fs;
    this._thumbnailPageMakerFn = options.thumbnailPageMakerFn;
    const stat = this._fs.statSync(filename);
    const scannedTime = this._folderData.scannedTime;
    this._needUpdate = !scannedTime || stat.mtimeMs > scannedTime;
    this._isMakingThumbnails = false;

    process.nextTick(() => {
      this._sendImagesAndVideos();
      this._processArchive();
    });
  }

  get filename() {
    return this._filename;
  }

  deleteData() {
    const files = this._folderData.files;
    const names = getSeparateFilenames(files);
    deleteThumbnails(this._fs, this._folderData.files);
    this._folderData.deleteData();
    return names;
  }

  close() {
  }

  getSeparateFilenames() {
    return getSeparateFilenames(this._folderData.files);
  }

  async _updateThumbnails() {
    this._logger('updateThumbnails');
    if (this._isMakingThumbnails) {
      throw new Error('already making thumbnails');
    }
    this._isMakingThumbnails = true;
    this._sendImagesAndVideos();
    // remove all the files since we just got a new archive
    this._folderData.removeFiles(Object.keys(this._folderData.files));
    try {
      const baseFilename = this._folderData.baseFilename;
      const files = await this._thumbnailPageMakerFn(this._filename, baseFilename);
      this._logger('got thumbnails', files);
      this._folderData.addFiles(files);
    } catch (e) {
      console.error(`could not make thumbails for: ${this._filename}`, e);
    } finally {
      this._isMakingThumbnails = false;
      this._folderData.setScannedTime();
    }
    this._sendImagesAndVideos();
    this._processArchive();
  }

  _sendImagesAndVideos() {
    this.emit('updateFiles', this._filename, this.getData());
  }

  getData() {
    return {
      files: getImagesAndVideos(this._folderData.files),
      status: {
        scanning: this._isMakingThumbnails,
        scannedTime: this._folderData.scannedTime,
        archive: true,
      },
    };
  }

  _processArchive() {
    if (this._isMakingThumbnails) {
      return;
    }
    if (!this._needUpdate) {
      return;
    }
    this._needUpdate = false;
    this._updateThumbnails();
  }

  refresh() {
    this.update();
  }

  update() {
    if (!this._needUpdate) {
      this._needUpdate = true;
      this._processArchive();
    }
  }
}

export {
  ArchiveFolder as default,
};
