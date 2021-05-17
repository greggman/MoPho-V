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
import fs from 'fs';
import {sync as readDirTreeSync} from '../lib/readdirtree';
import FolderData from '../pages/thumber/folder-data';
import * as utils from '../lib/utils';
import * as filters from '../lib/filters';
import {separateFiles} from '../pages/thumber/folder-utils';

let lastLineLength = 0;
function logLine(...args) {
  const line = [...args].join(' ');
  process.stdout.write(`${line.padEnd(lastLineLength)}\r`);
  lastLineLength = line.length;
}

function logDir(filepath) {
  logLine('readdir:', filepath);
}

function compareFoldersToCache(baseFolders, options) {
  const userDataDir = options.userDataDir;
  // get listings of all folders
  const realFolders = {};
  baseFolders.forEach((baseFolder) => {
    logLine('readdir:', baseFolder);
    if (utils.fileExistsSync(baseFolder)) {
      const tree = readDirTreeSync(baseFolder, {
        log: logDir,
      });
      tree.forEach((filename) => {
        const fullPath = path.join(baseFolder, filename);
        const dirname = path.dirname(fullPath);
        const folder = realFolders[dirname] || {};
        realFolders[dirname] = folder;
        folder[fullPath] = true;
      });
    }
  });
  const dataFolders = {};
  // read all data starting from baseFolders
  baseFolders.forEach((baseFolder) => {
    Object.assign(dataFolders, readDataFolderTree(baseFolder, userDataDir));
  });

  console.log('');

  // for each real folder, check that every image/video exists
  // in data folder
  for (const [folderName, files] of Object.entries(realFolders)) {
    const dataFolder = dataFolders[folderName];
    if (!dataFolder) {
      // does this folder have any files?
      console.error('no data for:', folderName);
    } else {
      const dataFiles = dataFolder.files;
      for (const filename of Object.keys(files)) {
        if (filters.isMediaExtension(filename)) {
          const fileInfo = dataFiles[filename];
          if (!fileInfo) {
            console.error('no entry for:', filename);
          }
        } else if (filters.isArchive(filename)) {
          const archiveFolder = dataFolders[filename];
          if (!archiveFolder) {
            console.error('no data for:', filename);
          } else {
            if (!archiveFolder.scannedTime) {
              console.error('folder not scanned:', filename);
            } else {
              if (Object.keys(archiveFolder.files).length === 0) {
                console.warn('no files for archive:', filename);
                if (options.deleteFolderDataIfNoFilesForArchive) {
                  console.log('DELETE:', archiveFolder.baseFolename, filename);
                  archiveFolder.deleteData();
                }
              }
            }
          }
        }
      }
    }
  }
}

function readDataFolderTree(folderPath, userDataDir) {
  logLine('read folder data:', folderPath);
  const folderData = new FolderData(folderPath, {
    readOnly: true,
    fs: fs,
    dataDir: userDataDir,
  });
  const folders = {};
  if (folderData.exists) {
    folders[folderPath] = folderData;
    const bins = separateFiles(folderData.files);
    for (const subFolderPath of Object.keys(bins.folders)) {
      Object.assign(folders, readDataFolderTree(subFolderPath, userDataDir));
    }
    for (const subFolderPath of Object.keys(bins.archives)) {
      Object.assign(folders, readDataFolderTree(subFolderPath, userDataDir));
    }
  }
  return folders;
}

export {
  compareFoldersToCache as default,
};
