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
  const blobUrls = [];

  try {
    logger('waiting for decompressor:', filepath);
    archiveHandle = await decompressorManager();
    logger('decompressing:', filepath);
    startTime = Date.now();
    archiveFiles = await archive.createDecompressor(filepath);

    // create file like info for each blob
    const blobInfos = {};

    // First get all the blobs
    const blobs = await Promise.all(Object.values(archiveFiles).map(async (fileInfo) => {
      return fileInfo.blob();
    }));

    // Now get URLs for all the blobs. This way if one of the blobs
    // fails we'll have no objectURLs to discard. Otherwise if we just
    // one blob failed we'd throw, we'd then fall through to cleanup
    // but other promises might still be pending
    Object.values(archiveFiles).forEach((fileInfo, ndx) => {
      const url = URL.createObjectURL(blobs[ndx]);
      blobUrls.push(url);
      blobInfos[url] = {
        url,
        size: fileInfo.size,
        type: fileInfo.type,
        mtime: fileInfo.mtime,
      };
    });
    tpmHandle = await thumbnailPageMakerManager();
    files = await tpmHandle.resource(
      baseFilename,
      [],  // there's never any old files for archives
      blobInfos,
    );

    // Map thumbnails from blobs back to files
    newFiles = {};
    const filesByBlob = {};
    Object.keys(archiveFiles).forEach((filename, ndx) => {
      filesByBlob[blobUrls[ndx]] = filename;
    });
    for (const [blobName, blobInfo] of Object.entries(files)) {
      const filename = filesByBlob[blobName];
      blobInfo.archiveName = filepath;
      newFiles[path.join(filepath, filename)] = {
        archiveName: filepath,
        ...blobInfo,
      };
    }
  } finally {
    if (tpmHandle) {
      tpmHandle.release();
    }
    blobUrls.forEach(URL.revokeObjectURL);
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
