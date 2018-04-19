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

// This class is used to manage
// a few limited resources (passed in)
// User's can get one by calling manager.get which returns
// a promise. The promise resolves to an object with the release function and the resource.
// You must call release when done with the resource
function createLimitedResourceManager(_resources) {
  const resources = _resources.slice();
  const pendingRequests = [];

  function releaseResource(resource) {
    resources.push(resource);
    // don't want these to get nested
    process.nextTick(processRequests);
  }

  function createProxy(resource) {
    let released = false;
    const pair = Proxy.revocable(resource, {});
    function release() {
      if (!released) {
        released = true;
        pair.revoke();
        releaseResource(resource);
      }
    }
    return {proxy: pair.proxy, release};
  }

  function processRequests() {
    while (pendingRequests.length && resources.length) {
      const resolve = pendingRequests.shift();
      const resource = resources.shift();
      const { proxy, release } = createProxy(resource);
      resolve({release: release, resource: proxy});
    }
  }

  return function get() {
    const p = new Promise((resolve /* , reject */) => {
      pendingRequests.push(resolve);
    });
    processRequests();
    return p;
  };
}

export {
  createLimitedResourceManager as default,
};
