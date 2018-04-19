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

class ForwardableEventDispatcher {
  constructor() {
    this._handlers = {};
  }
  setForward(forward) {
    this._forwarder = forward;
    if (forward) {
      forward._setBackward(this);
    }
  }
  _setBackward(backward) {
    this._backward = backward;
  }
  on(name, fn) {
    let handlers = this._handlers[name];
    if (!handlers) {
      handlers = [];
      this._handlers[name] = handlers;
    }
    handlers.push(fn);
  }
  removeListener(name, fn) {
    const handlers = this._handlers[name];
    if (handlers) {
      const ndx = handlers.indexOf(fn);
      if (ndx >= 0) {
        handlers.splice(ndx, 1);
        if (handlers.length === 0) {
          delete this._handlers[name];
        }
      }
    }
  }
  dispatch(forwardableEvent, ...args) {
    // this is effectively the focus for this subtree (go to the leaf)
    if (this._forwarder) {
      this._forwarder.dispatch(forwardableEvent, ...args);
    }
    if (!forwardableEvent.propagationStopped) {
      this._dispatchBackward(forwardableEvent, ...args);
    }
  }
  _dispatchBackward(forwardableEvent, ...args) {
    this._callHandlers(forwardableEvent, ...args);
    if (!forwardableEvent.propagationStopped) {
      if (this._backward) {
        this._backward._dispatchBackward(forwardableEvent, ...args);
      } else {
        forwardableEvent.stopPropagation();
      }
    }
  }
  _callHandlers(forwardableEvent, ...args) {
    const handlers = this._handlers[forwardableEvent.name];
    if (handlers) {
      if (handlers.length === 1) {
        handlers[0](forwardableEvent, ...args);
      } else {
        const h = [...handlers];  // make copy because handle might add/remove handlers
        for (let i = 0; i < h.length && !forwardableEvent.propagationStopped; ++i) {
          const handler = h[i];
          handler(forwardableEvent, ...args);
        }
      }
    }
  }
}

export {
  ForwardableEventDispatcher as default,
};
