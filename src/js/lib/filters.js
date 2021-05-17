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

const imageExtensions = {
  '.jpg': true,
  '.jpeg': true,
  '.png': true,
  '.gif': true,
  '.webp': true,
  '.svg': true,
};

const audioExtensions = {
  '.mp3': true,
  '.ogg': true,
  '.wav': true,
};

const videoExtensions = {
  '.webm': true,
  '.mkv': true,
  '.mp4': true,
  '.m4v': true,
  '.ogv': true,
};

const zipExtensions = {
  '.zip': true,
  '.cbz': true,
};

const rarExtensions = {
  '.rar': true,
  '.cbr': true,
};

function isDotFile(filename) {
  return filename.startsWith('.') || path.basename(filename).startsWith('.');
}

function isImageExtension(filename) {
  return !isDotFile(filename) && imageExtensions[path.extname(filename).toLowerCase()];
}

function isVideoExtension(filename) {
  return !isDotFile(filename) && videoExtensions[path.extname(filename).toLowerCase()];
}

function isAudioExtension(filename) {
  return !isDotFile(filename) && audioExtensions[path.extname(filename).toLowerCase()];
}

function isMediaExtension(filename) {
  return isImageExtension(filename) || isVideoExtension(filename) || isAudioExtension(filename);
}

function isGif(filename) {
  return !isDotFile(filename) && path.extname(filename).toLowerCase() === '.gif';
}

function isRar(filename) {
  return !isDotFile(filename) && rarExtensions[path.extname(filename).toLowerCase()];
}

function isZip(filename) {
  return !isDotFile(filename) && zipExtensions[path.extname(filename).toLowerCase()];
}

function isArchive(filename) {
  return isZip(filename) || isRar(filename);
}

function isMimeVideo(mimeType) {
  return mimeType.startsWith('video/');
}

function isMimeJpeg(mimeType) {
  return mimeType === 'image/jpeg';
}

function isMimeSvg(mimeType) {
  return mimeType.startsWith('image/svg');
}

function isMimeImage(mimeType) {
  return mimeType.startsWith('image/');
}

function isMimeAudio(mimeType) {
  return mimeType.startsWith('audio/');
}

function isMimeGif(mimeType) {
  return mimeType === 'image/gif';
}

function isMimeMedia(mimeType) {
  return isMimeVideo(mimeType) || isMimeImage(mimeType) || isMimeAudio(mimeType);
}

function isArchiveFilenameWeCareAbout(filename) {
  return isMediaExtension(filename)
      && filename.indexOf('__MACOS') < 0;   // hacky I know ...
}

export {
  isAudioExtension,
  isArchive,
  isArchiveFilenameWeCareAbout,
  isDotFile,
  isGif,
  isImageExtension,
  isMediaExtension,
  isMimeGif,
  isMimeJpeg,
  isMimeImage,
  isMimeAudio,
  isMimeMedia,
  isMimeSvg,
  isMimeVideo,
  isRar,
  isVideoExtension,
  isZip,
};
