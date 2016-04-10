(function() {
  function vendorModule() {
    'use strict';

    return { 'default': self['primus'] };
  }

  define('primus', [], vendorModule);
})();
