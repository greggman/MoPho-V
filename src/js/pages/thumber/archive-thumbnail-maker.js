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
import createParallelResourceManager from '../../lib/parallel-resource-manager';
import * as archive from './archive';

const decompressorManager = createParallelResourceManager(2);
const logger = debug('ArchiveThumbnailMaker');

async function createThumbnailsForArchive(filepath, baseFilename, thumbnailPageMakerManager) {
  let archiveHandle;
  let archiveFiles;
  let tpmHandle;
  let files;
  let newFiles;
  let startTime;
  try {
    logger('waiting for decompressor:', filepath);
    archiveHandle = await decompressorManager();
    logger('decompressing:', filepath);
    startTime = Date.now();
    archiveFiles = await archive.createDecompressor(filepath);

    // create file like info for each blob
    const blobInfos = {};
    for (const fileInfo of Object.values(archiveFiles)) {
      blobInfos[fileInfo.url] = fileInfo;
    }
    tpmHandle = await thumbnailPageMakerManager();
    files = await tpmHandle.resource(
      baseFilename,
      [],  // there's never any old files for archives
      blobInfos,
    );

    // Map thumbnails from blobs back to files
    newFiles = {};
    const filesByBlob = {};
    Object.keys(archiveFiles).forEach((filename) => {
      filesByBlob[archiveFiles[filename].url] = filename;
    });
    for (const [blobName, blobInfo] of Object.entries(files)) {
      const filename = filesByBlob[blobName];
      blobInfo.archiveName = filepath;
      newFiles[path.join(filepath, filename)] = Object.assign({
        archiveName: filepath,
      }, blobInfo);
    }
  } finally {
    if (tpmHandle) {
      tpmHandle.release();
    }
    if (archiveFiles) {
      archive.freeArchiveFiles(files);
    }
    if (archiveHandle) {
      archiveHandle();
    }
    const elapsedTime = Date.now() - startTime;
    logger('decompression for', filepath, 'took', (elapsedTime * .001).toFixed(1), 'seconds');
  }
  if (!newFiles) {
    throw new Error(`could not read archive: ${filepath}`);
  }
  return newFiles;
}

export {
  createThumbnailsForArchive as default,
};
