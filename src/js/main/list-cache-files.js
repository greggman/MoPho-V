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
import path from 'path';

function listCacheFiles(userDataDir) {
  const files = fs.readdirSync(userDataDir).filter((name) => {
    return path.basename(name).startsWith('folder-') && name.endsWith('.json');
  }).map((name) => {
    const filename = path.join(userDataDir, name);
    try {
      const data = JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
      return {
        version: data.version,
        foldername: data.folderPath,
        filename: filename,
      };
    } catch (e) {
      console.error('can not open/parse file:', filename);
      return {
        bad: true,
        filename: filename,
      };
    }
  });

  files.sort((a, b) => {
    return a < b ? -1 : a > b ? 1 : 0;
  });

  const results = files.map((file) => {
    return JSON.stringify(file);
  });

  console.log('[\n', results.join(',\n'), '\n]');
}

export {
  listCacheFiles as default,
};
