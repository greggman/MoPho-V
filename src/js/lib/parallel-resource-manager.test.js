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


import {assert} from 'chai';
import createParallelResourceManager from './parallel-resource-manager';
import wait from './wait';

describe('parallelResourceManager', () => {
  it('manages 1', async () => {
    const mgr = createParallelResourceManager(1);

    let oneRelease;
    let twoRelease;

    mgr().then((release) => {
      oneRelease = release;
    });
    mgr().then((release) => {
      twoRelease = release;
    });

    await wait();

    assert.isOk(oneRelease, 'one acquired');
    assert.isNotOk(twoRelease, 'two is pending');

    oneRelease();

    await wait();

    assert.isOk(twoRelease, 'two acquired');

    twoRelease();
  });

  it('manages N', async () => {
    const numParallel = 3;
    const mgr = createParallelResourceManager(numParallel);

    const numToTest = 10;
    const releases = [];

    function get(ndx) {
      releases[ndx] = false;
      mgr().then((release) => {
        releases[ndx] = release;
      });
    }

    for (let i = 0; i < numToTest; ++i) {
      get(i);
    }

    await wait();

    for (let i = 0; i <= numToTest; ++i) {
      const lastDone = Math.min(numToTest, i + numParallel);
      for (let j = 0; j < lastDone; ++j) {
        assert.isOk(releases[j]);
      }
      for (let j = i + numParallel; j < numToTest; ++j) {
        assert.isNotOk(releases[j]);
      }

      if (i < releases.length) {
        releases[i]();
      }

      await wait();
    }
  });
});
