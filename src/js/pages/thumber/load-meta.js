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

import * as filters from '../../lib/filters';
import * as exif from './exif';
import { urlFromFilename } from '../../lib/utils';

const orientationREs = [
  /top.*left/i,     // orientation: 1, },
  /top.*right/i,    // orientation: 2, },
  /bottom.*right/i, // orientation: 3, },
  /bottom.*left/i,  // orientation: 4, },
  /left.*top/i,     // orientation: 5, },
  /right.*top/i,    // orientation: 6, },
  /right.*bottom/i, // orientation: 7, },
  /left.*bottom/i,  // orientation: 8, },
];

function loadMeta(filename, type) {
  return new Promise((resolve /* , reject */) => {
    if (filters.isMimeJpeg(type)) {
      exif.load(urlFromFilename(filename), (error, exifData) => {
        if (error) {
          console.warn('could not read exif for:', filename, error);
        }
        let orientation = exifData && exifData.image ? (exifData.image.Orientation || 0) : 0;
        for (let i = 0; i < orientationREs.length; ++i) {
          if (orientationREs[i].test(orientation)) {
            orientation = i + 1;
            break;
          }
        }

        resolve({orientation: orientation | 0}); // convert string to number by | 0 vs parseInt which returns NaN for bad values
      });
    } else {
      resolve({orientation: 0});
    }
  });
}

export {
  loadMeta as default,
};

