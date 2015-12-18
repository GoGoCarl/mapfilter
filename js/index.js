'use strict'

// globally self-installing deps
require('./lib/locale.js')
require('./lib/leaflet-0.7.7.js')
require('./lib/bing_layer.js')
require('./lib/d3.v4.js')
require('./lib/d3-dates.v4.js')

var $ = require('jquery')

// app
window.locale.en = require('../data/en')
window.locale.fr = require('../data/fr')
window.locale.es = require('../data/es')
window.locale.init();

var mapFilter = require('./mapfilter/mapfilter.js')

var hostname = window.location.hostname

var render_app = function(config) {
  window.app = mapFilter({
    // target for monitoring data
    url: config.get('dataUrl'),

    // app container
    el: $('#app'),

    config: config,

    // An array of filters to explore the data.
    // `field` is the field/attribute to filter by
    // `type` should be `discrete` for string data and `continuous` for numbers or dates
    // `expanded` sets whether the filter view is expanded or collapsed by default
    // TODO: build filters based on config specifications
    filters: [{
      type: 'continuous',
      field: 'today',
      expanded: true
    }, {
      type: 'discrete',
      field: 'happening',
      expanded: true
    }, {
      type: 'discrete',
      field: 'people',
      expanded: true
    }],

    // Template to generate maptile urls. See http://leafletjs.com/reference.html#url-template
    tileUrl: '/monitoring-files/Maps/Tiles/{z}/{x}/{y}.png',
    // tileUrl: 'http://localhost:20008/tile/wapichana_background/{z}/{x}/{y}.png',

    // API key for Bing Maps use
    bingKey: 'AtCQswcYKiBKRMM8MHjAzncJvN6miHjgxbi2-m1oaFUHMa06gszNwt4Xe_te18FF'
  })
}

var Config = require('./mapfilter/config.js');
new Config().fetch({
  success: function(model, resp, opts) {
    render_app(model);
  },
  error: function(model, resp, opts) {
    console.log("Error loading configuration, using defaults.")
    render_app(model);
  }
});
