/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-data-primus',

  isDevelopingAddon: function() {
    return true;
  },

  included: function(app) {
    this._super.included.apply(this, arguments);

    // see: https://github.com/ember-cli/ember-cli/issues/3718
    if (typeof app.import !== 'function' && app.app) {
      app = app.app;
    }

    app.import('vendor/register-version.js');
  },

  contentFor: function(type, config) {
    if (type === 'ember-data-primus') {
      var url = config.primusLibraryUrl || '/primus/primus.js';
      return `<script src="${url}"></script>`;
    }
    return null;
  }
};
