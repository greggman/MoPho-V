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

function ListenerManager() {
  let listeners = {};
  let nextId = 1;

  // Returns an id for the listener. This is easier IMO than
  // the normal remove listener which requires the same arguments as addListener
  this.on = (elem, ...args) => {
    (elem.addEventListener || elem.on || elem.addListener).call(elem, ...args);
    const id = nextId++;
    listeners[id] = {
      elem: elem,
      args: args,
    };
    if (args.length < 2) {
      throw new Error('too few args');
    }
    return id;
  };

  this.remove = (id) => {
    const listener = listeners[id];
    if (listener) {
      delete listener[id];
      const elem = listener.elem;
      (elem.removeEventListener || elem.removeListener).call(elem, ...listener.args);
    }
  };

  this.removeAll = () => {
    const old = listeners;
    listeners = {};
    Object.keys(old).forEach((id) => {
      const listener = old[id];
      if (listener.args < 2) {
        throw new Error('too few args');
      }
      const elem = listener.elem;
      (elem.removeEventListener || elem.removeListener).call(elem, ...listener.args);
    });
  };
}

export {
  ListenerManager as default,
};

