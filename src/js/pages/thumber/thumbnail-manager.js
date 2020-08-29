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

// Architecture
//
// * ThumbnailManager watches a tree of folders
//   and loads/generates thumbnails
//
//   For each folder it creates a `Folder`.
//
//   Viewers should subscribe to a folder
//   with `getFolder` or maybe it should emit
//   'newFolder`
//
// * Folder
//
//   Represents the thumbnails of an individual
//   Folder/Archive.
//
//   When one is added to a view something should
//   call emitFiles which tells the Folder to
//   send out events for all the files it had
//
//   Otherwise the emits `addFile`, `removeFile`
//   events for each thumbnail
//
//

// * ThumbnailCollection
//
//   * Manages a set of images with thumbnails in them
//   * Loads from JSON
//   * Accepts events for new files
//     * If any file is new generates new thumbnails (if not already generating)
//     * saves to JSON on exit?
//       Why save on exit? Because files can be added at anytime. Maybe also save
//       on timeout since could crash?
//       This seems problematic. Maybe I shouldn't be *watching* folder at this level?
//       Except I like the idea of being able to add/delete individual files so do this
//

// ThumbnailCollection
//   Loads exis
//   Waits for add/change/remove events
//

import EventEmitter from 'events';
import path from 'path';
import _ from 'lodash';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import NativeFolder from './native-folder';
import ArchiveFolder from './archive-folder';
import createThumbnailsForFolder from './folder-thumbnail-maker';
import createThumbnailsForArchive from './archive-thumbnail-maker';
import WatcherConsolidator from './watcher-consolidator';
import FolderData from './folder-data';

function arrayInANotB(a, b) {
  return a.filter((elem) => b.indexOf(elem) < 0);
}

// This runs on the "server" and watches the filesystem
// for changes. It uses a Thumbnailer to generate
// thumbnails
class ThumbnailManager extends EventEmitter {
  constructor(options) {
    super();
    this._dataDir = options.dataDir;
    this._fs = options.fs;
    this._watcherFactory = options.watcherFactory;
    this._folders = {};
    this._archives = {};
    this._rootFolderNames = [];
    this._baseFolderNames = [];
    this._updateFilesPendingFolders = {};
    // this smells :(
    this._rootFolder = {
      folders: {},
      archives: {},
    };
    const thumbnailPageMakerManager = options.thumbnailPageMakerManager;
    bind(
      this,
      '_addFolder',
      '_removeFolder',
      '_addArchive',
      '_removeArchive',
      '_updateFolders',
      '_updateFiles',
      '_updateArchives',
      '_emitUpdateFiles',
      'refreshFolder',
    );
    this._emitUpdateFiles = _.throttle(this._emitUpdateFiles, 500);
    this._logger = debug('ThumbnailManager');
    this._folderThumbnailPageMakerFn = (oldFiles, newFiles, baseFilename) => createThumbnailsForFolder(oldFiles, newFiles, baseFilename, thumbnailPageMakerManager);
    this._archiveThumbnailPageMakerFn = (filepath, baseFilename) => createThumbnailsForArchive(filepath, baseFilename, thumbnailPageMakerManager);
  }

  setFolders(dirs, deleteMetaDataOnRemovedFolders) {
    this._baseFolderNames = dirs.map((folderPath) => path.dirname(folderPath));
    const foldersToRemove = _.difference(this._rootFolderNames, dirs);
    foldersToRemove.forEach((folder) => {
      this._removeFolder(folder, deleteMetaDataOnRemovedFolders);
    });
    this._rootFolderNames = dirs;
    dirs.forEach(this._addFolder);
  }

  sendAll(stream) {
    this._sendFolder(this._rootFolder, stream);
  }

  refreshFolder(folderName) {
    const folder = this._folders[folderName] || this._archives[folderName];
    if (folder) {
      folder.folder.refresh();
      Object.keys(folder.folders).forEach(this.refreshFolder);
      Object.keys(folder.archives).forEach(this.refreshFolder);
    } else {
      this._logger('no such folder:', folderName);
    }
  }

  _sendFolder(folder, stream) {
    if (folder.folder) {
      const data = folder.folder.getData();
      const filename = folder.folder.filename;
      stream.send('updateFiles', this._prepFilesForSending(filename, data));
    }
    Object.keys(folder.folders).forEach((name) => {
      const subFolder = folder.folders[name];
      this._sendFolder(subFolder, stream);
    });
    Object.keys(folder.archives).forEach((name) => {
      const subFolder = folder.archives[name];
      this._sendFolder(subFolder, stream);
    });
  }

  _logFile(eventName, d) {
    this._logger(eventName, JSON.stringify(d));
  }

  _addFolder(filename) {
    let folder = this._folders[filename];
    if (!folder) {
      const options = {
        dataDir: this._dataDir,
        fs: this._fs,
      };
      const folderData = new FolderData(filename, options);
      Object.assign(options, {
        thumbnailPageMakerFn: this._folderThumbnailPageMakerFn,
        watcher: new WatcherConsolidator(filename, this._watcherFactory, this._fs),
        folderData: folderData,
      });
      folder = new NativeFolder(filename, options);
      const folderInfo = {
        folder: folder,
        folders: {}, // this smells. Like `Folder` should handle this?
        archives: {}, // this smells. Like `Folder` should handle it?
      };
      this._folders[filename] = folderInfo;
      const parent = this._folders[path.dirname(filename)] || this._rootFolder;
      parent.folders[filename] = folderInfo;

      folder.on('updateFiles', this._updateFiles);
      folder.on('updateFolders', this._updateFolders);
      folder.on('updateArchives', this._updateArchives);
    }
    return folder;
  }

  _removeFolder(filename, deleteMetaData) {
    this._logger('removeFolder:', filename);
    const folder = this._folders[filename];
    if (folder) {
      // I don't like this but I don't know what order the watches will
      // come in. If a parent comes in before a child then there would
      // be nothing to remove the children since this is a flat heirarchy.
      // (maybe it shouldn't be?). Then, where as the folders normally
      // emit events we're would not receive events because we need to
      // unsubscribe from the folder.

      const childNames = folder.folder.getSeparateFilenames();
      if (deleteMetaData) {
        folder.folder.deleteData();
      }
      childNames.folders.forEach((folderPath) => {
        this._removeFolder(folderPath, deleteMetaData);
      });
      childNames.archives.forEach((archivePath) => {
        this._removeArchive(archivePath, deleteMetaData);
      });
      folder.folder.close();
      folder.folder.removeAllListeners();
      delete this._folders[filename];
      const parent = this._folders[path.dirname(filename)] || this._rootFolder;
      delete parent.folders[filename];
      const folders = {};
      folders[filename] = {};
      this.emit('updateFiles', folders);
    }
  }

  _updateFolders(folderPath, folders) {
    this._logger('updateFolders:', folderPath, folders);
    const folder = this._folders[folderPath];
    const oldFolderNames = Object.keys(folder.folders);
    const newFolderNames = Object.keys(folders);
    const removedFolderNames = arrayInANotB(oldFolderNames, newFolderNames);
    const addedFolderNames = arrayInANotB(newFolderNames, oldFolderNames);

    removedFolderNames.forEach((folderName) => {
      this._removeFolder(folderName);
    });
    addedFolderNames.forEach((folderName) => {
      this._addFolder(folderName);
    });
  }

  _updateFiles(folderName, folder) {
    this._logger('updateFiles', folderName);
    const folders = this._prepFilesForSending(folderName, folder);
    Object.assign(this._updateFilesPendingFolders, folders);
    this._emitUpdateFiles();
  }

  _emitUpdateFiles() {
    const folders = this._updateFilesPendingFolders;
    this._updateFilesPendingFolders = {};
    this.emit('updateFiles', folders);
  }

  _prepFilesForSending(folderName, folder) {
    const folders = {};
    const newFiles = {};
    const files = folder.files;
    for (const [filename, fileInfo] of Object.entries(files)) {
      newFiles[filename] = {...fileInfo, displayName: this._createDisplayPath(filename)};
    }
    folders[folderName] = {...folder, files: newFiles};
    return folders;
  }

  _createDisplayPath(filename) {
    let base = '';
    for (const baseFolderName of this._baseFolderNames) {
      if (filename.startsWith(baseFolderName) && baseFolderName.length > base) {
        base = baseFolderName;
      }
    }
    return filename.substring(base.length);
  }

  // Originally I planned to make archives a kind of virtual folder but for the time being
  // they seem to work someone differently. Maybe I can refactor later
  _addArchive(filename, needUpdate) {
    this._logger('addArchive:', filename);
    let archiveFolder = this._archives[filename];
    if (!archiveFolder) {
      const options = {
        dataDir: this._dataDir,
        fs: this._fs,
      };
      const folderData = new FolderData(filename, options);
      Object.assign(options, {
        thumbnailPageMakerFn: this._archiveThumbnailPageMakerFn,
        folderData: folderData,
      });
      archiveFolder = new ArchiveFolder(filename, options);
      const folderInfo = {
        folder: archiveFolder,
        folders: {}, // this smells. Like `Folder` should handle this?
        archives: {}, // this smells. Like `Folder` should handle it?
      };
      this._archives[filename] = folderInfo;
      const parent = this._folders[path.dirname(filename)] || this._rootFolder;
      parent.archives[filename] = folderInfo;

      archiveFolder.on('updateFiles', this._updateFiles);
      // for now I'm not supporting nested archives
      // archiveFolder.on('updateFolders', this._updateFolders);
      // archiveFolder.on('updateArchives', this._updateArchives);
    }
    if (needUpdate) {
      archiveFolder.update();
    }
    return archiveFolder;
  }

  _removeArchive(filename, deleteMetaData) {
    this._logger('removeArchive', filename);
    const arc = this._archives[filename];
    if (arc) {
      if (deleteMetaData) {
        /* const childNames = */ arc.folder.deleteData();
      }
      arc.folder.removeAllListeners();
      arc.folder.close();
      delete this._archives[filename];
      const parent = this._folders[path.dirname(filename)] || this._rootFolder;
      delete parent.archives[filename];
      const archives = {};
      archives[filename] = {};
      this.emit('updateFiles', archives);
    }
  }

  _updateArchives(folderPath, archives, archiveFilenamesThatNeedUpdate) {
    this._logger('updateArchive:', folderPath);
    const folder = this._folders[folderPath];
    const oldArchiveNames = Object.keys(folder.archives);
    const newArchiveNames = Object.keys(archives);
    const removedArchiveNames = arrayInANotB(oldArchiveNames, newArchiveNames);
    const addedArchiveNames = arrayInANotB(newArchiveNames, oldArchiveNames);

    removedArchiveNames.forEach((archiveName) => {
      this._removeArchive(archiveName);
    });
    addedArchiveNames.forEach((archiveName) => {
      const needUpdate = archiveFilenamesThatNeedUpdate.indexOf(archiveName) >= 0;
      this._addArchive(archiveName, needUpdate);
    });
  }
}

export {
  ThumbnailManager as default,
};
