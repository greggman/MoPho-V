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

import chalk from 'chalk';

let s_colorNdx = 0;
function generateColor() {
  /* eslint-disable no-bitwise */
  const h = (((s_colorNdx & 0x01) << 5) |
             ((s_colorNdx & 0x02) << 3) |
             ((s_colorNdx & 0x04) << 1) |
             ((s_colorNdx & 0x08) >> 1) |
             ((s_colorNdx & 0x10) >> 3) |
             ((s_colorNdx & 0x20) >> 5)) / 64.0;
  const s   = (s_colorNdx & 0x10) !== 0 ? 0.5 : 1.0;
  const l   = (s_colorNdx & 0x20) !== 0 ? 0.2 : 0.4;
  /* eslint-enable no-bitwise */

  ++s_colorNdx;
  return {
    h: h * 360 | 0,
    s: s * 100 | 0,
    l: l * 100 | 0,
  };
}

function makeCSSColor(hsl) {
  return `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
}

const defaultColor = 'color:inherit;';
function makeBrowserLog(color, name) {
  return console.log.bind(console, '%c%s: %c', `color: ${makeCSSColor(color)}`, name, defaultColor);  // eslint-disable-line
}

function makeTerminalLog(color, name) {
  return console.log.bind(console, chalk.hsl(color.h, color.s, color.l)(name));  // eslint-disable-line
}

function makeLogFunc(baseName, subName) {
  const name = subName !== undefined ? `${baseName}[${subName}]` : baseName;
  const color = generateColor();
  const logger = process.type === 'renderer'
    ? makeBrowserLog(color, name)
    : makeTerminalLog(color, name);
  logger.getPrefix = () => name;
  logger.id = name;
  logger.throw = (...args) => {
    throw new Error(`${name}: ${[...args].join(' ')}`);
  };
  logger.error = (...args) => {
    console.error(name, ...args);
  };
  return logger;
}

export {
  makeLogFunc as default,
};

