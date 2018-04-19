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

function isImageExtension(filename) {
  return imageExtensions[path.extname(filename).toLowerCase()];
}

function isVideoExtension(filename) {
  return videoExtensions[path.extname(filename).toLowerCase()];
}

function isImageOrVideoExtension(filename) {
  return isImageExtension(filename) || isVideoExtension(filename);
}

function isGif(filename) {
  return path.extname(filename).toLowerCase() === '.gif';
}

function isRar(filename) {
  return rarExtensions[path.extname(filename).toLowerCase()];
}

function isZip(filename) {
  return zipExtensions[path.extname(filename).toLowerCase()];
}

function isArchive(filename) {
  return isZip(filename) || isRar(filename);
}

function isMimeVideo(mimeType) {
  return mimeType.substring(0, 6) === 'video/';
}

function isMimeJpeg(mimeType) {
  return mimeType === 'image/jpeg';
}

function isMimeSvg(mimeType) {
  return mimeType.substring(0, 9) === 'image/svg';
}

function isMimeImage(mimeType) {
  return mimeType.substring(0, 6) === 'image/';
}

function isMimeGif(mimeType) {
  return mimeType === 'image/gif';
}

function isMimeImageOrVideo(mimeType) {
  return isMimeVideo(mimeType) || isMimeImage(mimeType);
}

function isArchiveFilenameWeCareAbout(filename) {
  return isImageOrVideoExtension(filename) &&
         filename.indexOf('__MACOS') < 0;   // hacky I know ...
}

export {
  isArchive,
  isArchiveFilenameWeCareAbout,
  isGif,
  isImageExtension,
  isImageOrVideoExtension,
  isMimeGif,
  isMimeJpeg,
  isMimeImage,
  isMimeImageOrVideo,
  isMimeSvg,
  isMimeVideo,
  isRar,
  isVideoExtension,
  isZip,
};

