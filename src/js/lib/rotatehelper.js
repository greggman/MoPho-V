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

const rotateModes = [
  { className: 'deg0',   axis: 'X', xMult:  1, yMult:  1, },  // eslint-disable-line
  { className: 'deg90',  axis: 'Y', xMult:  1, yMult: -1, },  // eslint-disable-line
  { className: 'deg180', axis: 'X', xMult: -1, yMult: -1, },  // eslint-disable-line
  { className: 'deg270', axis: 'Y', xMult: -1, yMult:  1, },  // eslint-disable-line
];

function getRotatedXY(e, fieldName, rotateMode) {
  const ri = rotateModes[rotateMode];
  const xAxis = ri.axis;
  const yAxis = xAxis === 'X' ? 'Y' : 'X';
  return {
    x: e[fieldName + xAxis] * ri.xMult,
    y: e[fieldName + yAxis] * ri.yMult,
  };
}

const orientationInfo = [
  { rotation:   0, scale: [ 1,  1], }, // 1
  { rotation:   0, scale: [-1,  1], }, // 2
  { rotation:   0, scale: [-1, -1], }, // 3
  { rotation:   0, scale: [ 1, -1], }, // 4
  { rotation: 270, scale: [-1,  1], }, // 5
  { rotation: 270, scale: [-1, -1], }, // 6
  { rotation:  90, scale: [-1,  1], }, // 7
  { rotation:  90, scale: [-1, -1], }, // 8
];

function getOrientationInfo(item, orientation) {
  const info = orientationInfo[(orientation || 1) - 1];
  return {
    width: info.rotation ? item.height : item.width,
    height: info.rotation ? item.width : item.height,
    ...info,
  };
}

export {
  rotateModes,
  getRotatedXY,
  getOrientationInfo,
};

