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
import {defaultPrefs, getPrefs} from './default-prefs';

describe('default-prefs', () => {
  it('returns defaults', () => {
    assert.deepEqual(getPrefs(), defaultPrefs);
  });

  it('fills in defaults', () => {
    assert.deepEqual(getPrefs({}), defaultPrefs);
  });

  it('fills missng defaults', () => {
    assert.deepEqual(getPrefs({
      misc: {
        stepForwardDuration: defaultPrefs.misc.stepForwardDuration,
      }
    }), defaultPrefs);
    assert.deepEqual(getPrefs({
      slideshowDuration: {
        image: defaultPrefs.slideshowDuration.image,
      }
    }), defaultPrefs);
  });

  it('does not override existing values', () => {
    const prefs = getPrefs({
      misc: {
        stepForwardDuration: 123,
      }
    });
    assert.strictEqual(prefs.misc.stepForwardDuration, 123);
    assert.strictEqual(prefs.misc.stepBackwardDuration, defaultPrefs.misc.stepBackwardDuration);
  });
});
