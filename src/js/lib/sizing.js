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

/**
 * scale so height fits dest
 */
function fitHeight(srcWidth, srcHeight, dstWidth, dstHeight) {
  return {
    width: srcWidth * dstHeight / srcHeight | 0,
    height: dstHeight,
  };
}

/**
 * scale so width fits dest
 */
function fitWidth(srcWidth, srcHeight, dstWidth/* , dstHeight */) {
  return {
    width: dstWidth,
    height: srcHeight * dstWidth / srcWidth | 0,
  };
}

/**
 * leave as is
 */
function actualSize(srcWidth, srcHeight/* , dstWidth, dstHeight */) {
  return {
    width: srcWidth,
    height: srcHeight,
  };
}
/**
 * scale so the dest is entirely covered
 */
function cover(srcWidth, srcHeight, dstWidth, dstHeight) {
  const size = fitWidth(srcWidth, srcHeight, dstWidth, dstHeight);
  if (size.height < dstHeight) {
    return fitHeight(srcWidth, srcHeight, dstWidth, dstHeight);
  } else {
    return size;
  }
}

/**
 * scale so the dest is 100% in which ever dimension fits
 */
function stretch(srcWidth, srcHeight, dstWidth, dstHeight) {
  const size = fitWidth(srcWidth, srcHeight, dstWidth, dstHeight);
  if (size.height > dstHeight) {
    return fitHeight(srcWidth, srcHeight, dstWidth, dstHeight);
  } else {
    return size;
  }
}

/**
 * scale down if larger than dest
 */
function constrain(srcWidth, srcHeight, dstWidth, dstHeight) {
  if (srcWidth > dstWidth || srcHeight > dstHeight) {
    return stretch(srcWidth, srcHeight, dstWidth, dstHeight);
  } else {
    return actualSize(srcWidth, srcHeight, dstWidth, dstHeight);
  }
}


export {
  cover,
  stretch,
  constrain,
  fitHeight,
  fitWidth,
  actualSize,
};
