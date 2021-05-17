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

import _ from 'lodash';

function addClass(elem, className) {
  elem.className = _.pull(elem.className.split(' '), className).concat(className).join(' ');
}

function removeClass(elem, className) {
  elem.className = _.pull(elem.className.split(' '), className).join(' ');
}

function exists(a) {
  return !!a;
}

class CSSArray {
  constructor(...args) {
    this._classes = [...args].filter(exists);
  }
  add(...classNames) {
    this._classes = [...this._classes, [...classNames].filter(exists)];
    return this;
  }
  addIf(cond, ...classNames) {
    if (cond) {
      this.add([...classNames].filter(exists));
    }
    return this;
  }
  remove(...classNames) {
    for (const className of classNames) {
      for (;;) {
        const ndx = this._classes.indexOf(className);
        if (ndx < 0) {
          break;
        }
        this._classes.splice(ndx, 1);
      }
    }
    return this;
  }
  removeIf(cond, ...classNames) {
    if (cond) {
      this.remove(...classNames);
    }
    return this;
  }
  toString() {
    return this._classes.join(' ');
  }
}

function cssArray(...args) {
  return new CSSArray(...args);
}

function hsl(h, s, l) {
  return `hsl(${h * 360 | 0}, ${s * 100 | 0}%, ${l * 100 | 0}%)`;
}

export {
  addClass,
  removeClass,
  CSSArray,
  cssArray,
  hsl,
};
