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
import _ from 'lodash';
import crypto from 'crypto';
import bind from '../../lib/bind';
import {hashPassword} from '../../lib/password-utils';
import Modal from '../../lib/ui/modal';

class PasswordInput extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_setPassword',
    );
  }
  componentDidMount() {
    // no idea why but autoFocus didn't work
    // neither did ref={(input) => { if (input) { input.focus(); }}
    this._input.focus();
  }
  _setPassword() {
    this.props.setPassword(this._input.value.trim());
  }
  render() {
    return (
      <div>
        <input
          ref={(input) => { this._input = input; }}
          type="password"
        />
        <button type="button" onClick={this._setPassword}>Set</button>
        <button type="button" onClick={this.props.cancelPassword}>Cancel</button>
        <button type="button" onClick={this.props.clearPassword}>Clear</button>
      </div>
    );
  }
}

class LivePasswordEditor extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_setPassword',
      '_cancel',
      '_editPassword',
      '_clearPassword',
    );
    this.state = {
      editing: false,
    };
    _.debounce(this._setPassword, 250);
  }
  _cancel() {
    this.setState({
      editing: false,
    });
  }
  _clearPassword() {
    this.props.onChange('');
    this._cancel();
  }
  _setPassword(password) {
    if (password.length) {
      hashPassword(crypto, password, this.props.onChange);
    } else {
      this.props.onChange('');
    }
    this._cancel();
  }
  _editPassword() {
    this.setState({
      editing: true,
    });
  }
  render() {
    const {hasPassword} = this.props;
    const {editing} = this.state;
    if (editing) {
      return (
        <Modal>
          <div>
            <div>Enter a password</div>
            <PasswordInput
              setPassword={this._setPassword}
              clearPassword={this._clearPassword}
              cancel={this._cancel}
            />
          </div>
        </Modal>
      );
    }
    if (!hasPassword) {
      return (
        <div>
          <button type="button" onClick={this._editPassword}>Set</button>
        </div>
      );
    } else {
      return (
        <div>
          <div>Password: ********</div>
          <button type="button" onClick={this._editPassword}>Edit</button>
        </div>
      );
    }
  }
}

export {
  LivePasswordEditor as default,
};
