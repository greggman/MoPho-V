// parts of this code from Visual Studio Code
// https://github.com/Microsoft/vscode/blob/2f76c44632b0d47ba97f66fbc158c763628e30b3/src/vs/base/node/decoder.ts
/*
MIT License

Copyright (c) 2015 - present Microsoft Corporation

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable */

import sd from 'string_decoder';

const CharCode = {
  CarriageReturn: 0x0D,
  LineFeed: 0x0A,
};

class LineDecoder {
  constructor(encoding = 'utf8') {
    this.stringDecoder = new sd.StringDecoder(encoding);
    this.remaining = null;
  }

  write(buffer) {
    let result = [];
    let value = this.remaining
      ? this.remaining + this.stringDecoder.write(buffer)
      : this.stringDecoder.write(buffer);

    if (value.length < 1) {
      return result;
    }
    let start = 0;
    let ch;
    while (start < value.length && ((ch = value.charCodeAt(start)) === CharCode.CarriageReturn || ch === CharCode.LineFeed)) {
      start++;
    }
    let idx = start;
    while (idx < value.length) {
      ch = value.charCodeAt(idx);
      if (ch === CharCode.CarriageReturn || ch === CharCode.LineFeed) {
        result.push(value.substring(start, idx));
        idx++;
        while (idx < value.length && ((ch = value.charCodeAt(idx)) === CharCode.CarriageReturn || ch === CharCode.LineFeed)) {
          idx++;
        }
        start = idx;
      } else {
        idx++;
      }
    }
    this.remaining = start < value.length ? value.substr(start) : null;
    return result;
  }

  end() {
    return this.remaining;
  }
}

export {
  LineDecoder as default,
};
