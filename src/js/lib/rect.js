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

function right(rect) {
  return rect.x + rect.width;
}

function bottom(rect) {
  return rect.y + rect.height;
}

function contains(rect, x, y) {
  return x >= rect.x && x < right(rect) &&
         y >= rect.y && y < bottom(rect);
}

function intersect(rect1, rect2) {
  return !(empty(rect1) ||
           empty(rect2) ||
           right(rect1) <= rect2.x ||
           right(rect2) <= rect1.x ||
           bottom(rect1) <= rect2.y ||
           bottom(rect2) <= rect1.y);
}

// doesn't handle rects with width or height < 0
function intersection(rect1, ...rects) {
  const rect = Object.assign({}, rect1);
  for (const other of [...rects]) {
    const rectRight = right(rect);
    const otherRight = right(other);
    const rectBottom = bottom(rect);
    const otherBottom = bottom(other);
    const newLeft = Math.max(rect.x, other.x);
    const newTop = Math.max(rect.y, other.y);
    const newRight = Math.min(rectRight, otherRight);
    const newBottom = Math.min(rectBottom, otherBottom);
    rect.x = newLeft;
    rect.y = newTop;
    rect.width = newRight - newLeft;
    rect.height = newBottom - newTop;
  }
  return rect;
}

// doesn't handle rects with width or height <= 0
function union(rect1, ...rects) {
  const rect = Object.assign({}, rect1);
  for (const other of [...rects]) {
    const rectRight = right(rect);
    const otherRight = right(other);
    const newRight = Math.max(rectRight, otherRight);
    const rectBottom = bottom(rect);
    const otherBottom = bottom(other);
    const newBottom = Math.max(rectBottom, otherBottom);
    rect.x = Math.min(rect.x, other.x);
    rect.y = Math.min(rect.y, other.y);
    rect.width = newRight - rect.x;
    rect.height = newBottom - rect.y;
  }
  return rect;
}

function empty(rect) {
  return rect.width <= 0 || rect.height <= 0;
}

export {
  bottom,
  contains,
  empty,
  right,
  intersect,
  intersection,
  union,
};
