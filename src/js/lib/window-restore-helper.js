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

import electron from 'electron';  // eslint-disable-line
import * as rect from './rect';

function adjustDimension(innerBounds, outerBounds, axis, dim) {
  const dispMax = outerBounds[axis] + outerBounds[dim];
  const winMax = innerBounds[axis] + innerBounds[dim];
  if (winMax > dispMax) {
    innerBounds[axis] -= winMax - dispMax;
  }
  if (innerBounds[axis] < outerBounds[axis]) {
    innerBounds[axis] += outerBounds[axis] - innerBounds[axis];
  }
  if (innerBounds[dim] > outerBounds[dim]) {
    innerBounds[dim] = outerBounds[dim];
  }
}

function putWindowOnNearestDisplay(winBounds) {
  const dispBounds = electron.screen.getDisplayMatching(winBounds).bounds;
  adjustDimension(winBounds, dispBounds, 'x', 'width');
  adjustDimension(winBounds, dispBounds, 'y', 'height');
  const perfectFit = winBounds.x === dispBounds.x &&
                     winBounds.y === dispBounds.y &&
                     winBounds.width === dispBounds.width &&
                     winBounds.height === dispBounds.height;
  return perfectFit;
}

function isTitlebarOnAtLeastOneDisplay(winBounds) {
  // should this be OS specific?
  const screen = electron.screen;
  const titleHeight = screen.getMenuBarHeight ? screen.getMenuBarHeight() : 20;
  const titleMinIntersectionWidth = 40;
  const titleMinIntersectionHeight = titleHeight;
  const displays = screen.getAllDisplays();

  const titleBounds = {
    x: winBounds.x,
    y: winBounds.y,
    width: winBounds.width,
    height: titleHeight,
  };
  for (const display of displays) {
    const dispBounds = display.bounds;
    const intersection = rect.intersection(dispBounds, titleBounds);
    if (!rect.empty(intersection)) {
      if (intersection.width >= titleMinIntersectionWidth &&
          intersection.height >= titleMinIntersectionHeight) {
        return true;
      }
    }
  }
  return false;
}

export {
  isTitlebarOnAtLeastOneDisplay,
  putWindowOnNearestDisplay,
};
