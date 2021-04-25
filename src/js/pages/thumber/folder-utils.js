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

import * as filters from '../../lib/filters';
import {filenameFromUrl, getObjectsByKeys} from '../../lib/utils';

function getImagesAndVideos(files) {
  const filenames = Object.keys(files);
  const imagesAndVideos = {};
  filenames.forEach((filename) => {
    const fileInfo = files[filename];
    if (!fileInfo.isDirectory && fileInfo.type && filters.isMimeImageOrVideo(fileInfo.type)) {
      imagesAndVideos[filename] = fileInfo;
    }
  });
  return imagesAndVideos;
}

function separateFilesByPages(files, filenames) {
  filenames = filenames || Object.keys(files);
  const pages = {};
  for (const filename of filenames) {
    const info = files[filename];
    // might be no thumbnail if old was bad?
    const thumbnail = info.thumbnail;
    if (thumbnail) {
      let page = pages[thumbnail.url];
      if (!page) {
        page = [];
        pages[thumbnail.url] = page;
      }
      page.push(filename);
    }
  }
  return pages;
}

function deleteThumbnails(fs, files) {
  const pages = separateFilesByPages(files);
  for (const pageUrl of Object.keys(pages)) {
    const filename = filenameFromUrl(pageUrl);
    fs.unlinkSync(filename);
  }
}

function getSeparateFilenames(files) {
  const allFilenames = Object.keys(files);
  const folderNames = allFilenames.filter((filename) => files[filename].isDirectory && !filters.isDotFile(filename));
  const fileNames = allFilenames.filter((filename) => !files[filename].isDirectory);
  const archiveNames = fileNames.filter(filters.isArchive);
  const imageAndVideoNames = fileNames.filter(filters.isImageOrVideoExtension);
  return {
    imagesAndVideos: imageAndVideoNames,
    folders: folderNames,
    archives: archiveNames,
  };
}

function separateFiles(files) {
  const names = getSeparateFilenames(files);
  const imagesAndVideos = getObjectsByKeys(files, names.imagesAndVideos);
  const archives = getObjectsByKeys(files, names.archives);
  const folders = getObjectsByKeys(files, names.folders);
  return {
    imagesAndVideos: imagesAndVideos,
    archives: archives,
    folders: folders,
  };
}


export {
  deleteThumbnails,
  getSeparateFilenames,
  getImagesAndVideos,
  separateFiles,
  separateFilesByPages,
};
