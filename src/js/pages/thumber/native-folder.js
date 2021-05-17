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
import * as filters from '../../lib/filters';
import debug from '../../lib/debug';
import ListenerManager from '../../lib/listener-manager';
import {areFilesSame, getDifferentFilenames} from '../../lib/utils';
import {
  getImagesAndVideos,
  getSeparateFilenames,
  deleteThumbnails,
  separateFiles,
} from './folder-utils';

function filterFiles(files) {
  const filteredFiles = {};
  Object.keys(files)
    .filter(
      (filename) => files[filename].isDirectory ||
      filters.isArchive(filename) ||
      filters.isMediaExtension(filename)
    )
    .forEach((filename) => {
      filteredFiles[filename] = files[filename];
    });
  return filteredFiles;
}

// Represents one Folder of thumbnails
class NativeFolder extends EventEmitter {
  constructor(filename, options) {
    super();
    this._logger = debug('Folder', filename);
    this._logger('new folder');
    this._filename = filename;
    this._folderData = options.folderData;
    this._thumbnailPageMakerFn = options.thumbnailPageMakerFn;
    this._watcher = options.watcher;
    this._fs = options.fs;
    // if there are new files then we have work to do
    this._newFiles = undefined;
    this._isMakingThumbnails = false;
    // we always have a watcher which will call
    // _updateFiles after it has readdir this folder
    // so _isChecking tracks that state.
    this._isChecking = true;
    bind(
      this,
      '_updateFiles',
    );

    process.nextTick(() => {
      this._sendImagesAndVideos();
      const bins = separateFiles(this._folderData.files);
      this._sendFoldersAndArchives(bins);
    });

    this._listenerManager = new ListenerManager();
    const on = this._listenerManager.on.bind(this._listenerManager);
    on(this._watcher, 'files', this._updateFiles);
  }

  deleteData() {
    const files = this._folderData.files;
    const names = getSeparateFilenames(files);
    deleteThumbnails(this._fs, files);
    this._folderData.deleteData();
    return names;
  }

  close() {
    this._listenerManager.removeAll();
    this._watcher.close();
  }

  getSeparateFilenames() {
    return getSeparateFilenames(this._folderData.files);
  }

  refresh() {
    this._watcher.refresh();
  }

  get filename() {
    return this._filename;
  }

  async _updateThumbnails(oldImagesAndVideos, newImagesAndVideos) {
    this._logger('updateThumbnails');
    if (this._isMakingThumbnails) {
      throw new Error('already making thumbnails');
    }
    this._isMakingThumbnails = true;
    this._sendImagesAndVideos();
    try {
      const files = await this._thumbnailPageMakerFn(oldImagesAndVideos, newImagesAndVideos, this._folderData.baseFilename);
      this._logger('got thumbnails', files);
      this._folderData.addFiles(files);
    } catch (e) {
      console.error(`could not make thumbnails for: ${this._filename}`, e);
    } finally {
      this._isMakingThumbnails = false;
      this._folderData.setScannedTime();
    }
    this._sendImagesAndVideos();
    this._processFiles();
  }

  _sendImagesAndVideos() {
    this.emit('updateFiles', this._filename, this.getData());
  }

  getData() {
    return {
      files: getImagesAndVideos(this._folderData.files),
      status: {
        scanning: this._isMakingThumbnails,
        checking: this._isChecking,
        scannedTime: this._folderData.scannedTime,
      },
    };
  }

  _addFiles(files) {
    this._folderData.addFiles(files);
  }

  _removeFiles(filenames) {
    this._folderData.removeFiles(filenames);
  }

  // This is called by the watcher to give us ALL
  // the files and folders for this folder
  // @param {Object.<string, stat>} files
  _updateFiles(files) {
    this._logger('updateFiles:', files);
    this._isChecking = false;
    this._sendImagesAndVideos();
    // first filter out everything we don't want
    this._newFiles = filterFiles(files);
    this._processFiles();
  }

  _processFiles() {
    if (this._isMakingThumbnails) {
      return;
    }
    if (!this._newFiles) {
      return;
    }
    const oldFiles = {...this._folderData.files};
    const newFiles = this._newFiles;
    this._newFiles = undefined;
    this._logger('processFiles:', newFiles);
    const oldBins = separateFiles(oldFiles);
    const newBins = separateFiles(newFiles);
    const diffNames = getDifferentFilenames(oldFiles, newFiles);
    this._removeFiles(diffNames.removed);
    // check if any data has changed
    if (!areFilesSame(oldFiles, newFiles)) {
      this._updateThumbnails(oldBins.imagesAndVideos, newBins.imagesAndVideos);
    }
    this._logger('emit updateFolders', this._filename);
    this._addFiles(newBins.folders);
    this._logger('emit updateArchives', this._filename);
    this._addFiles(newBins.archives);
    // we need to know which archives changed or were added
    const archiveFilenamesThatNeedUpdate = _.intersection(
      [...diffNames.changed, ...diffNames.added],
      Object.keys(newBins.archives),
    );
    this._sendFoldersAndArchives(newBins, archiveFilenamesThatNeedUpdate);
  }

  _sendFoldersAndArchives(bins, archiveFilenamesThatNeedUpdate = []) {
    this.emit('updateFolders', this._filename, bins.folders);
    this.emit('updateArchives', this._filename, bins.archives, archiveFilenamesThatNeedUpdate);
  }
}

export {
  NativeFolder as default,
};
