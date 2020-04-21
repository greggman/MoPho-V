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

import fs from 'fs';
import mime from 'mime-types';
import * as unzipit from 'unzipit';
import debug from '../../lib/debug';
import * as filters from '../../lib/filters';
import * as utils from '../../lib/utils';
import readRARContent from '../../../../app/3rdparty/libunrar-js/libunrar';

const pfs = fs.promises;
const s_slashRE = /[/\\]/g;
function makeSafeName(name) {
  return name.replace(s_slashRE, '|');
}

unzipit.setOptions({
  workerURL: utils.urlFromFilename(require.resolve('unzipit/dist/unzipit-worker.js')),
  numWorkers: 2,
});

function freeArchiveFiles(files) {
  // Need to handle closing in middle of extraction :(
  Object.keys(files).forEach((filename) => {
    URL.revokeObjectURL(files[filename].url);
  });
}

async function zipDecompress(filename) {
  const _logger = debug('ZipDecompressor', filename);
  const _files = {};

  try {
    const url = utils.urlFromFilename(filename);
    console.log(filename, url);
    const {entries: zipFiles} = await unzipit.unzip(url);
    const zipNames = Object.keys(zipFiles);
    // TODO: do I want to support videos?
    const zipPromises = zipNames.filter(filters.isArchiveFilenameWeCareAbout).map(async (name, ndx) => {
      try {
        const zipOb = zipFiles[name];
        _logger(filename, ndx, zipOb.name, name);
        const type = mime.lookup(name) || '';
        const blob = await zipOb.blob(type);
        const url = URL.createObjectURL(blob);
        const safeName = makeSafeName(name);  // this is to remove folders (needed?)
        _files[safeName] = {
          url: url,
          type: type,
          size: blob.size,
          mtime: zipOb.lastModDate.getTime(),
        };
      } catch (err) {
        console.error(err);
      }
    });
    await Promise.all(zipPromises);
    return _files;
  } catch (err) {
    console.error(err);
    freeArchiveFiles(_files);
    throw err;
  }
}

function gatherRarFiles(entry, files, logger) {
  switch (entry.type) {
    case 'file': {
      const name = entry.fullFileName;
      if (!filters.isArchiveFilenameWeCareAbout(name)) {
        return;
      }
      const type = mime.lookup(name) || '';
      const content = entry.fileContent.buffer;
      const blob = new Blob([content], { type: type, });
      const url = URL.createObjectURL(blob);
      const safeName = makeSafeName(name);
      files[safeName] = {
        url: url,
        type: type,
        size: entry.fileSize,
        // We don't have mtime from this lib so just put in a date that should fail.
        // The idea is we'll check the archive mtime and if that's changed then
        // we'll scan all the files inside here.
        mtime: Date.now(),
      };
      break;
    }
    case 'dir': {
      Object.keys(entry.ls).forEach((name) => {
        gatherRarFiles(entry.ls[name], files, logger);
      });
      break;
    }
    default:
      logger('Unknown type:', entry.type);
      break;
  }
}

function rarDecompress(filename) {
  const _logger = debug('RarDecompressor', filename);
  const _files = {};

  const p = pfs.readFile(filename)
    .then((data) => {
      _logger('unrar:', filename);
      const rarContent = readRARContent([
        { name: 'tmp.rar', content: data },
      ], (/* ...args */) => {
        // _logger("process:", ...args);
      });
      gatherRarFiles(rarContent, _files, _logger);
      return _files;
    }).catch((err) => {
      console.error(err);
      freeArchiveFiles(_files);
      throw err;
    });
  return p;
}

function mightBeZip(buf) {
  return buf[0] === 0x50 && // P
         buf[1] === 0x4B;   // K
}

function mightBeRar(buf) {
  // Check for `Rar!`
  return buf[0] === 0x52 && // R
         buf[1] === 0x61 && // a
         buf[2] === 0x72 && // r
         buf[3] === 0x21;   // !
}

async function createDecompressor(filename) {
  const buf = Buffer.alloc(4);
  const fh = await pfs.open(filename, 'r');
  await fh.read(buf, 0, buf.length, null);
  await fh.close();
  if (mightBeZip(buf)) {
    return zipDecompress(filename);
  } else if (mightBeRar(buf)) {
    return rarDecompress(filename);
  } else if (filters.isZip(filename)) {
    // Zips don't technically start with any signature, they end with one
    // but too lazy to check that for now
    return zipDecompress(filename);
  } else {
    throw new Error('unknown file type');
  }
}

export {
  createDecompressor,
  freeArchiveFiles,
};
