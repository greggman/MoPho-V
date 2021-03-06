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

class StatelessFileReader {
  constructor(filename) {
    this.filename = filename;
  }
  async getLength() {
    if (this.length === undefined) {
      const stat = await pfs.stat(this.filename);
      this.length = stat.size;
    }
    return this.length;
  }
  async read(offset, length) {
    const fh = await pfs.open(this.filename);
    const data = new Uint8Array(length);
    await fh.read(data, 0, length, offset);
    await fh.close();
    return data;
  }
}

async function zipDecompress(filename) {
  const _files = {};

  try {
    const reader = new StatelessFileReader(filename);
    const {entries: zipFiles} = await unzipit.unzip(reader);
    const zipNames = Object.keys(zipFiles);
    // TODO: do I want to support videos?
    zipNames.filter(filters.isArchiveFilenameWeCareAbout).forEach((name) => {
      const zipOb = zipFiles[name];
      const type = mime.lookup(name) || '';
      const blob = () => zipOb.blob(type);
      const safeName = makeSafeName(name);  // this is to remove folders (needed?)
      _files[safeName] = {
        type,
        blob,
        size: zipOb.size,
        mtime: zipOb.lastModDate.getTime(),
      };
    });
    return _files;
  } catch (err) {
    console.error(err);
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
      const blob = async () => new Blob([content], { type: type, });
      const safeName = makeSafeName(name);
      files[safeName] = {
        type,
        blob,
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

async function rarDecompress(filename) {
  const _logger = debug('RarDecompressor', filename);
  const _files = {};

  const data = await pfs.readFile(filename);
  _logger('unrar:', filename);
  const rarContent = readRARContent([
    { name: 'tmp.rar', content: data },
  ], (/* ...args */) => {
    // _logger("process:", ...args);
  });
  gatherRarFiles(rarContent, _files, _logger);
  return _files;
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
};
