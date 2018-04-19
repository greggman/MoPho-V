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

class ThumbnailRenderer {
  constructor(ctx) {
    this._ctx = ctx;
  }
  makeThumbnail(elem, elemWidth, elemHeight, orientation, maxWidth) {
    // orientation
    //
    // 1 top left side       norm
    // 2 top right side      hflip
    // 3 bottom right side   hflip & vflip
    // 4 bottom left side    vflip
    // 5 left side top       rot90 xflip
    // 6 right side top      rot270
    // 7 right side bottom   rot270 xflip
    // 8 left side bottom    rot90

    // NOTE: The confusing part is the data is stored
    // differently such that doing the rotations below
    // is not how to get them to work :(

    //   1        2       3      4         5            6           7          8
    //
    // 888888  888888      88  88      8888888888  88                  88  8888888888
    // 88          88      88  88      88  88      88  88          88  88      88  88
    // 8888      8888    8888  8888    88          8888888888  8888888888          88
    // 88          88      88  88
    // 88          88  888888  888888

    const ctx = this._ctx;

    orientation = orientation ? orientation : 1;
    const swap = (orientation - 1) & 0x4;  // eslint-disable-line no-bitwise
    const exifWidth  = swap ? elemHeight : elemWidth;
    const exifHeight = swap ? elemWidth : elemHeight;

    const imageWidth = maxWidth;
    const imageHeight = exifHeight * imageWidth / exifWidth | 0;

    const drawWidth  = swap ? imageHeight : imageWidth;
    const drawHeight = swap ? imageWidth : imageHeight;

    ctx.canvas.width = imageWidth;
    ctx.canvas.height = imageHeight;
    ctx.save();

    switch (orientation) {
      default:
        break;
      case 2:
        // horizontal flip
        ctx.translate(imageWidth, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        // 180° rotate left
        ctx.translate(imageWidth, imageHeight);
        ctx.rotate(Math.PI);
        break;
      case 4:
        // vertical flip
        ctx.translate(0, imageHeight);
        ctx.scale(1, -1);
        break;
      case 5:
        // vertical flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        // 90° rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -drawHeight);
        break;
      case 7:
        // horizontal flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(drawWidth, -drawHeight);
        ctx.scale(-1, 1);
        break;
      case 8:
        // 90° rotate left
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-drawWidth, 0);
        break;
    }

    ctx.drawImage(elem, 0, 0, drawWidth, drawHeight);
    ctx.restore();

    return ctx.canvas;
  }
}

export {
  ThumbnailRenderer as default,
};
