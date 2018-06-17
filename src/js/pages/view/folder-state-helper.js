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
import debug from '../../lib/debug';
import KeyHelper from '../../lib/key-helper';

const log = debug('FolderStateHelper');

function createSortName(name) {
  const parts = name.split(/(\d+)/);
  for (let ii = 1; ii < parts.length; ii += 2) {
    parts[ii] = parts[ii].padStart(10, '0');
  }
  return parts.join('').toLowerCase();
}

function getSortName(orig) {
  return orig.sortName;
}

function sortBySortPath(a, b) {
  const aStr = getSortName(a.info);
  const bStr = getSortName(b.info);
  return aStr < bStr ? -1 : (aStr > bStr ? 1 : 0);
}

function sortBySortName(a, b) {
  const aStr = path.basename(getSortName(a.info));
  const bStr = path.basename(getSortName(b.info));
  return aStr < bStr ? -1 : (aStr > bStr ? 1 : 0);
}

function sortByNewest(a, b) {
  const diff = a.info.mtime - b.info.mtime;
  if (diff) {
    return diff > 0 ? -1 : 1;
  }
  const aStr = getSortName(a.info);
  const bStr = getSortName(b.info);
  return aStr < bStr ? -1 : (aStr > bStr ? 1 : 0);
}

function getIndexToInsertBySortPath(array, folder) {
  return getIndexBySortName(array, folder.sortName);
}

function getIndexToInsertByNewestDate(array, folder) {
  let ndx;
  for (ndx = 0; ndx < array.length; ++ndx) {
    if (folder.newest > array[ndx].newest) {
      break;
    }
    if (folder.newest === array[ndx].newest &&
        folder.sortName <= array[ndx].sortName) {
      break;
    }
  }
  return ndx;
}

function getIndexBySortName(array, sortName) {
  // switch to binary search
  let ndx;
  for (ndx = 0; ndx < array.length; ++ndx) {
    if (sortName <= array[ndx].sortName) {
      break;
    }
  }
  return ndx;
}

function getIndexToInsertBySortName(array, folder) {
  const folderName = path.basename(folder.sortName);
  // switch to binary search
  let ndx;
  for (ndx = 0; ndx < array.length; ++ndx) {
    if (folderName <= path.basename(array[ndx].sortName)) {
      break;
    }
  }
  return ndx;
}

function getIndexOfFolderByFolderName(array, folderName) {
  return array.findIndex((folder) => {
    return folder.filename === folderName;
  });
}

const sortModes = new KeyHelper({
  sortPath: { indexFn: getIndexToInsertBySortPath,   sortFn: sortBySortPath, icon: 'images/buttons/sort-by-path.svg', hint: 'sort by path', },
  newest:   { indexFn: getIndexToInsertByNewestDate, sortFn: sortByNewest,   icon: 'images/buttons/sort-by-date.svg', hint: 'sort by date', },
  sortName: { indexFn: getIndexToInsertBySortName,   sortFn: sortBySortName, icon: 'images/buttons/sort-by-name.svg', hint: 'sort by name', },
});

class FolderStateHelper {
  static createFolder(filename, files, extra) {
    return Object.assign({
      filename,
      sortName: createSortName(filename),
      name: path.basename(filename),
      files,
      totalFiles: 0,
    }, extra);
  }

  static createRoot(sortMode) {
    return {
      folders: [],
      totalFiles: 0,
      indexFn: sortModes.value(sortMode).indexFn,
      sortFn: sortModes.value(sortMode).sortFn,
    };
  }

  static sortFiles(folderName, files, sortFn) {
    const filenames = Object.keys(files);
    log('updateFiles:', folderName, 'num files:', filenames.length);
    // log('addFiles:', filenames.join('\n'));
    let newest;
    let oldest;
    const newFiles = filenames.map((filename) => {
      const info = files[filename];
      info.sortName = createSortName(filename);
      info.filename = filename;
      if (info.bad) {
        Object.assign(info, {
          type: 'application/octet-stream',
          thumbnail: {
            x: 0,
            y: 0,
            width: 150,   //  FIX: this won't work if we change the thubmnail size :(
            height: 150,
            url: 'images/bad.png',
          }
        });
      } else {
        newest = newest ? Math.max(info.mtime, newest) : info.mtime;
        oldest = oldest ? Math.min(info.mtime, oldest) : info.mtime;
      }
      return {
        name: filename,
        info: files[filename],
      };
    }).sort(sortFn);
    return {
      newFiles,
      newest,
      oldest,
    };
  }

  static updateFolders(root, folders, prefs) {
    const newFolders = root.folders.slice();
    let totalFiles = root.totalFiles;
    for (const [folderName, folder] of Object.entries(folders)) {
      const {newFiles, newest, oldest} = FolderStateHelper.sortFiles(folderName, folder.files, root.sortFn);
      const oldNdx = getIndexOfFolderByFolderName(newFolders, folderName);
      if (oldNdx >= 0) {
        const oldFolder = newFolders[oldNdx];
        newFolders.splice(oldNdx, 1);
        totalFiles -= oldFolder.files.length;
      }
      const status = folder.status;
      const haveNewFiles = (prefs && prefs.showEmpty) || newFiles.length > 0;
      if (haveNewFiles || status.scanning || (status.checking && !status.scannedTime)) {
        const newFolder = FolderStateHelper.createFolder(folderName, newFiles, Object.assign({newest, oldest}, status));
        const newNdx = root.indexFn(newFolders, newFolder);
        newFolders.splice(newNdx, 0, newFolder);
        totalFiles += newFiles.length;
      }
      log('updated folder:', folderName, 'with', newFiles.length, 'files');
    }
    root.folders = newFolders;
    root.totalFiles = totalFiles;
  }
}

export {
  sortModes,
  FolderStateHelper,
};

