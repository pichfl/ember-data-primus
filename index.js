/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-data-primus',

  isDevelopingAddon: () => true,

  included: function(app) {
    this._super.included.apply(this, arguments);

    // see: https://github.com/ember-cli/ember-cli/issues/3718
    if (typeof app.import !== 'function' && app.app) {
      app = app.app;
    }

    app.import('vendor/register-version.js');
  }
};
