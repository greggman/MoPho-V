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
import {assert} from 'chai';
import TestFS from './test-fs';
import {makePublicPromise} from './test-utils';

describe('TestFS', () => {
  it('cleans up', () => {
    const testFS = new TestFS();

    const baseFilename = testFS.baseFilename;
    const filename1 = path.join(baseFilename, 'test1');
    const foldername1 = path.join(baseFilename, 'test2');
    const filename2 = path.join(foldername1, 'test3');

    testFS.writeFileSync(filename1, 'foo');
    testFS.mkdirSync(foldername1);
    testFS.writeFileSync(filename2, 'foo');

    testFS.close();

    assert.isNotOk(fs.existsSync(filename1));
    assert.isNotOk(fs.existsSync(foldername1));
    assert.isNotOk(fs.existsSync(filename2));
  });

  it('cleans up async', async () => {
    const testFS = new TestFS();

    const baseFilename = testFS.baseFilename;
    const filename1 = path.join(baseFilename, 'test1');
    const foldername1 = path.join(baseFilename, 'test2');
    const filename2 = path.join(foldername1, 'test3');

    const file1 = makePublicPromise();
    testFS.writeFile(filename1, 'foo', file1.resolve);
    const folder1 = makePublicPromise();
    testFS.mkdir(foldername1, file1, folder1.resolve);

    await folder1.promise;

    const file2 = makePublicPromise();
    testFS.writeFile(filename2, 'foo', file2.resolve);

    await file1.promise;
    await file2.promise;

    testFS.close();

    assert.isNotOk(fs.existsSync(filename1));
    assert.isNotOk(fs.existsSync(foldername1));
    assert.isNotOk(fs.existsSync(filename2));
  });
});
