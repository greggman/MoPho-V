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
import createLimitedResourceManager from './limited-resource-manager';
import wait from './wait';

describe('limitedResourceManager', () => {
  class TestResource {
    constructor(v) {
      this._v = v;
    }
    test() {
      return this._v;
    }
  }

  it('manages 1', async () => {
    const expected = 123;
    const mgr = createLimitedResourceManager([new TestResource(expected)]);

    let onePair;
    let twoPair;

    mgr().then((pair) => {
      onePair = pair;
    });
    mgr().then((pair) => {
      twoPair = pair;
    });

    await wait();

    assert.isOk(onePair, 'one acquired');
    assert.isNotOk(twoPair, 'two is pending');
    assert.strictEqual(onePair.resource.test(), expected, 'can use resource');

    onePair.release();

    // can not use released resource
    assert.throws(() => { onePair.resource.test(); });

    await wait();

    assert.isOk(twoPair, 'two acquired');
    assert.strictEqual(twoPair.resource.test(), expected, 'can use resource');

    twoPair.release();

    // can not use released resource
    assert.throws(() => { twoPair.resource.test(); });
  });

  it('manages N', async () => {
    const numResources = 10;
    const resources = [];
    for (let i = 0; i < numResources; ++i) {
      resources.push(new TestResource(i));
    }
    const mgr = createLimitedResourceManager(resources);

    const pairs = [];

    function get(ndx) {
      pairs[ndx] = false;
      mgr().then((pair) => {
        pairs[ndx] = pair;
      });
    }

    const numToTest = numResources * 2;
    for (let i = 0; i < numToTest; ++i) {
      get(i);
    }

    await wait();

    for (let i = 0; i <= numToTest; ++i) {
      const lastDone = Math.min(numToTest, i + numResources);
      for (let j = i; j < lastDone; ++j) {
        assert.isOk(pairs[j]);
        assert.strictEqual(pairs[j].resource.test(), j % numResources, 'can use resource');
      }
      for (let j = i + numResources; j < numToTest; ++j) {
        assert.isNotOk(pairs[j]);
      }

      pairs[i % numResources].release();
      assert.throws(accessResourceFn(pairs[i % numResources]));

      await wait();
    }

    function accessResourceFn(resource) {
      return () => resource.test();
    }
  });
});
