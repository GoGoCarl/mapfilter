'use strict'

module.exports = require('backbone').Model.extend({

  url: './json/mapfilter-config.json',

  defaults: {
    canSaveFilters: false,
    showVersion: true,
    saveFilterTargets: [],
    imageUrlRoot: '/monitoring-files',
    dataUrl: '/json/Monitoring.json',
    mapZoom: 13,
    mapCenterLat: -3.917096328676119,
    mapCenterLong: -77.78382001878626
  },

  getBingProxyPath: function(url) {
    if (this.get('bingProxy')) {
      return this.get('bingProxy') + '/' + encodeURIComponent(url);
    } else
      return url;
  },

  getBingMetadataPath: function(url) {
    if (this.get('bingMetadata')) {
      return this.get('bingMetadata') + '/' + encodeURIComponent(url);
    } else
      return url;
  },

  getSaveFilterTargets: function() {
    return this.get('saveFilterTargets');
  },

  getFilterValue: function(field) {
    var filters = this.get('filters');
    var value = null;
    if (filters != null && filters != undefined) {
      if (filters[field])
        value = filters[field].value;
    }
    return value;
  },

  getImageUrl: function(path) {
    if (path)
      return this.get('imageUrlRoot') + (path.indexOf('/') == 0 ? path : ("/" + path));
  },

  getMapCenter: function() {
    var lat = this.get('mapCenterLat'), lng = this.get('mapCenterLong');
    if (lat && lng)
      return [lat, lng];
    else
      return [this.defaults.mapCenterLat, this.defaults.mapCenterLong];
  },

  /*
   * Should be an object with the following properties:
   *
   * tiles: {
   *   url: '/tileLayers', // the url to get the list of layers
   *   tilesPath: '/monitoring-files/Maps/Tiles' // the base path for tiles
   * }
   */
  getTilesInfo: function() {
    return this.get('tiles')
  },

  hasTiles: function() {
    if (this.get('tiles'))
      return true;
    else
      return false;
  },

  /*
   * Should be an object with the following properties:
   *
   * tracks: {
   *   url: '/tracks', // the url to load tracks from
   *   soundsPath: '/sounds', // the base path for sounds
   *   iconPath: '/mapfilter' // the base path for icons
   * }
   */
  getTracksInfo: function() {
    return this.get('tracks')
  },

  isTracksEnabled: function() {
    if (this.get('tracks'))
      return true;
    else
      return false;
  }

})
