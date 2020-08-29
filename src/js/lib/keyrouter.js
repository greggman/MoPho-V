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

import keycode from 'keycode';

function getMods(e) {
  const alt   = (e.altKey   ? 'a' : '');
  const ctrl  = (e.ctrlKey  ? 'c' : '');
  const shift = (e.shiftKey ? 's' : '');
  const meta  = (e.metaKey  ? 'm' : '');
  return `${alt}${ctrl}${meta}${shift}`;
}

function prepMods(mods) {
  const chars = Array.prototype.map.call(mods.toLowerCase(), (c) => c);
  chars.sort();
  return chars.join('');
}

/**
 * Routes keys based on keycode and modifier
 */
class KeyRouter {
  constructor() {
    this.keyToAction = {};
  }
  /**
   * gets a key
   * @param {Event} e the key event
   * @return {ActionInfo}
   */
  getActionForKey(e) {
    const keyId = `${e.keyCode}:${getMods(e)}`;
    return this.keyToAction[keyId];
  }

  /**
   * @param {number} keyCode the keycode
   * @param {string} [mods] the modifiers where
   *   's' = shift, 'c' = ctrl, 'a' = alt, 'm' = meta (apple key, windows key)
   * @param {function(Event}) handler the funciton to call when key is pressed
   */
  registerKeys(keyConfig) {
    this.keyToAction = {};
    keyConfig.forEach((key) => {
      const keyCode = key.keyCode;
      const mods = key.modifiers || '';
      const keyId = `${keyCode}:${prepMods(mods)}`;
      this.keyToAction[keyId] = key;
    });
  }
}

function keyInfoToId(keyInfo) {
  return keyInfo.keyCode.toString() + keyInfo.modifiers || '';
}

const meta = process.platform.startsWith('win')
  ? 'win'
  : process.platform === 'darwin'
    ? '⌘'
    : 'meta';

function modifiersToString(mods) {
  const parts = [];
  if (mods) {
    if (mods.indexOf('c') >= 0) {
      parts.push('ctrl');
    }
    if (mods.indexOf('a') >= 0) {
      parts.push('alt');
    }
    if (mods.indexOf('s') >= 0) {
      parts.push('shift');
    }
    if (mods.indexOf('m') >= 0) {
      parts.push(meta);
    }
  }
  return parts;
}

function keyInfoToString(keyInfo) {
  const mods = modifiersToString(keyInfo.modifiers);
  const key = keycode(keyInfo.keyCode) || `0x${keyInfo.keyCode.toString(16)}`;
  if (mods.indexOf(key) < 0) {
    mods.push(key);
  }
  return mods.join('+');
}

function eventToKeyInfo(event) {
  return {
    keyCode: event.keyCode,
    modifiers: getMods(event),
  };
}

export {
  eventToKeyInfo,
  keyInfoToId,
  keyInfoToString,
  KeyRouter as default,
};
