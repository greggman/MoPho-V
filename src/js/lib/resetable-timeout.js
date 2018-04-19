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

import bind from './bind';
import debug from './debug';

let resetTimeoutId = 0;

// * ResetableTimeout
//   Like `setTimeout` except you can call `reset` to extend the timeout

class ResetableTimeout {
  constructor(fn, timeoutInMS, thresholdInMS) {
    this._fn = fn;
    this._id = ++resetTimeoutId;
    this._logger = debug('ResetableTimeout', this._id);
    this._thresholdInMS = thresholdInMS || timeoutInMS / 4;
    this._timeOfLastRealReset = 0;
    bind(
      this,
      '_handleTimeout',
    );
    this.reset(timeoutInMS);
  }
  reset(timeoutInMS) {
    if (timeoutInMS !== undefined) {
      this._timeoutInMS = timeoutInMS;
    }
    const now = Date.now();
    const timeSinceLastReset = this._timeOfLastRealReset - now;
    if (timeoutInMS === undefined && this._timeoutId && timeSinceLastReset < this._thresholdInMS) {
      this._logger('timeout not reset');
      return;
    }
    this._logger('timeout reset');
    this._timeOfLastRealReset = now;
    this.cancel();
    this._timeoutId = setTimeout(this._handleTimeout, this._timeoutInMS);
  }
  cancel() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }
  }
  _handleTimeout() {
    this._logger('timeout triggered');
    this._timeoutId = undefined;
    this._fn();
  }
}

export {
  ResetableTimeout as default,
};

