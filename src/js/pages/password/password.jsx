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

import React from 'react';
import { render as reactRender } from 'react-dom';
import {ipcRenderer} from 'electron';  // eslint-disable-line
import stacktraceLog from '../../lib/stacktrace-log.js';  // eslint-disable-line
import '../../lib/title';
import {cssArray} from '../../lib/css-utils';
import {checkPassword} from '../../lib/password-utils';
import Modal from '../../lib/ui/modal';

// const isDevMode = process.env.NODE_ENV === 'development';

class Password extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
    };
  }
  componentDidMount() {
    // no idea why but autoFocus didn't work
    // neither did ref={(input) => { if (input) { input.focus(); }}
    this.input.focus();
  }
  render() {
    return (
      <Modal>
        <div className={(cssArray('msg').addIf(this.state.error, 'error'))}>
          <div>Password</div>
          <input
            type="password"
            ref={(input) => { this.input = input; }}
            onKeyPress={(event) => {
              if (event.key === 'Enter') {
                checkPassword(this.props.password, event.target.value.trim(), (isMatch) => {
                  if (isMatch) {
                    ipcRenderer.send('unlock');
                  } else {
                    this.setState({
                      error: true,
                    });
                  }
                });
              }
            }}
          />
        </div>
      </Modal>
    );
  }
}

ipcRenderer.on('password', (event, password) => {
  reactRender(
    <Password password={password} />,
    document.querySelector('.browser')
  );
});
ipcRenderer.send('getPassword');

