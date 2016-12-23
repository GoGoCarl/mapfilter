/* global L */
// MapFilter.MapPane
// -----------------

// The MapFilter MapPane manages the map and markers on the map, hiding markers which
// do not match the current filter whenever the filter changes.
//
// `options.center` is a [lat,lon] array of the starting center point for the map
// `options.zoom` is the initial zoom level for the map                                                                                                                                   this.markersById[model.cid]       =    new           MapFilter.MarkerView({ model: model, map:             this.map });     } [description]
// `options.tileUrl` is [URL template](http://leafletjs.com/reference.html#url-template) for map tile layer
'use strict'

var MarkerView = require('./marker_view.js')
var _ = require('lodash')
var TileLayers = require('../tile_layers.js')

var $ = require('jquery')

module.exports = require('backbone').View.extend({
  initialize: function (options) {
    this.appView = options.appView

    this.config = options.config

    this._loadStatus = {
      map: false,
      tiles: false,
      tracks: false
    }

    // Initialize the [Leaflet](http://leafletjs.com/) map attaching to this view's element
    console.log('Initializing the map pane')
    var map = this.map = L.map(this.el, {
      center: options.center,
      zoom: options.zoom,
      scrollWheelZoom: options.scrollWheelZoom || true
    })
    if (options.onBaseLayerChange) {
      map.on('baselayerchange', options.onBaseLayerChange)
    }

    this._interactive = options.interactive

    L.bingLayer.initialize = function (key, options) {
      L.Util.setOptions(this, options)

      var cachedMeta = {
        'resourceSets': [{
          'resources': [{
            'imageHeight': 256,
            'imageUrl': 'http:\/\/ecn.{subdomain}.tiles.virtualearth.net\/tiles\/a{quadkey}.jpeg?g=2732',
            'imageUrlSubdomains': ['t0', 't1', 't2', 't3'],
            'imageWidth': 256,
            'imageryProviders': null
          }]
        }],
        'statusCode': 200,
        'statusDescription': 'OK'
      }

      this._key = key
      this._url = null
      this.meta = cachedMeta
      this.initMetadata()
      this.loadMetadata()
    }

    // Create a layer with Bing satellite imagery
    this.bingLayer = L.bingLayer(options.bingKey).addTo(this.map)

    // this.cloudMadeLayer = L.tileLayer.provider('CloudMade', {
    //     apiKey: options.cloudMadeKey,
    //     styleID: '123'
    // })

    var baseMaps = this.baseMaps = {}
    var overlayMaps = this.overlayMaps = {}

    baseMaps[t('ui.map_pane.layers.bing')] = this.bingLayer

    this.currentBaseLayer = t('ui.map_pane.layers.bing')

    this._loadStatus.map = true;

    if (this.config.hasTiles()) {
      var self = this
      var tilesConfig = this.config.getTilesInfo()
      var tileLayers = new TileLayers()
      tileLayers.url = tilesConfig.url
      tileLayers.fetch({
        success: function (model, resp, opts) {
          console.log('Successfully fetched tile layers:')
          console.log(tileLayers)
          var newLayers = []
          tileLayers.each(function (tileLayer) {
            console.log('+ adding a tile layer to the map:')
            console.log(tileLayer)
            var baseLayer = L.tileLayer(tilesConfig.tilesPath + '/' + tileLayer.attributes.name + '/{z}/{x}/{y}.png')
            baseMaps[tileLayer.attributes.name] = baseLayer
            newLayers.push(tileLayer.attributes.name)
          })
          L.control.layers(baseMaps, overlayMaps).addTo(map)
          for (var i = 0; i < newLayers.length; i++) {
            self.checkDefaultBaseLayer(newLayers[i], self)
          }
          self._loadStatus.tiles = true
        },
        error: function (model, resp, opts) {
          console.log('Could not fetch more tile layers. Limited to Bing')
          L.control.layers(baseMaps).addTo(map)
          self._loadStatus.tiles = true
        }
      })
    } else {
      L.control.layers(baseMaps).addTo(map)
      this._loadStatus.tiles = true
    }

    if (this.config.isTracksEnabled()) {
      var tracksConfig = this.config.getTracksInfo()
      var self = this
      var popup_for = function (map_props) {
        var html = ''
        if (map_props.name) {
          console.log('binding popup for ' + map_props.name)
          html += '<div>' + map_props.name + '</div>'
        }
        if (map_props.time) {
          html += '<div>' + map_props.time + '</div>'
        }
        if (map_props.sym) {
          html += '<div>' + map_props.sym + '</div>'
        }
        if (map_props.voice_memo) {
          html += '<div><a target="_blank" href="' +
            tracksConfig.soundsPath + '/' + map_props.voice_memo + '">' +
            map_props.voice_memo + '</div>'
        }
        return html
      }
      var onEachFeature = function (feature, layer) {
        var map_props = feature.properties
        var popupContent = popup_for(map_props)
        layer.bindPopup(popupContent)
        if (layer instanceof L.Polyline) {
            console.log("This is a polyline layer")
            layer.setStyle({
                'color': '#ff0033',
                'weight': 5,
                'opacity': 1
            })
        }
      }
      var polyStyle = {
        stroke: true,
        color: '#000033',
        weight: 5,
        opacity: 0.5
      }
      var tracksLayer = L.geoJson(null, {
        onEachFeature: onEachFeature,
        style: polyStyle
      })

      overlayMaps[t('ui.map_pane.layers.tracks')] = tracksLayer
      L.Icon.Default.imagePath = tracksConfig.iconPath

      $.ajax({
        dataType: 'json',
        url: tracksConfig.url,
        success: function (data) {
          tracksLayer.addData(data)
          self._loadStatus.tracks = true
        }
      }).error(function (err) {
        console.log('Error loading tracks json')
        console.log(err)
        self._loadStatus.tracks = true
      })
    } else {
      this._loadStatus.tracks = true
    }

    // Object to hold a reference to any markers added to the map
    this.markersById = {}

    // When a new model is created, add a new marker to the map
    this.listenTo(this.collection, 'add', this.addOne)

    // When the models are initially fetched, or the collection is reset
    // remove and re-add all the markers to the map
    this.listenTo(this.collection, 'firstfetch reset', this.addAll)

    // Remove a marker from the map when the model is removed from collection
    this.listenTo(this.collection, 'remove', this.removeOne)

    // Filter which markers are hidden or shown whenever the collection
    // is filtered
    this.listenTo(this.collection, 'filtered', this.filter)
  },

  // Create a new MarkerView for each model added to the collection,
  // and store a reference to that view in markersById
  addOne: function (model) {
    this.markersById[model.cid] = new MarkerView({
      model: model,
      map: this.map,
      appView: this.appView,
      interactive: this._interactive
    })
  },

  // Remove all the markers from the map and add a marker for each model
  // in the collection
  addAll: function () {
    this.removeAll()
    this.collection.each(this.addOne, this)
  },

  // Remove a single marker for a given model from the map
  removeOne: function (model) {
    this.markersById[model.cid].remove()
    // Remove reference to marker to allow garbage collection
    delete this.markersById[model.cid]
  },

  // Remove all markers from the map
  removeAll: function () {
    _.each(this.markersById, function (v) {
      this.removeOne(v.model)
    }, this)
  },

  // `this.collection.groupByCid.all()` is an array of every model in the collection by `cid`.
  // The value will be 0 for filtered models, 1 for models that are unfiltered.
  // This loops through `this.group.all()` and calls `MapFilter.MarkerView.show()`
  filter: function () {
    var i = 0
    this.collection.groupByCid.all().forEach(function (d) {
      this.markersById[d.key].show(d.value, i)
      i += d.value
    }, this)
  },

  checkDefaultBaseLayer: function(name, that) {
    var self = that || this
    if (self.config) {
      var defaultBaseLayer = self.config.get('baseLayer')
      if (defaultBaseLayer && self.currentBaseLayer != defaultBaseLayer && name == defaultBaseLayer) {
        self.setBaseLayer(name)
      }
    }
  },

  setBaseLayer: function(name, that) {
    var self = that || this
    var oldLayer = self.baseMaps[self.currentBaseLayer]
    var newLayer = self.baseMaps[name]
    if (oldLayer && newLayer) {
      self.map.removeLayer(oldLayer);
      self.map.addLayer(newLayer);
      self.currentBaseLayer = name;
    }
  },

  getMap: function() {
    return this.map;
  },

  getPoints: function(cb) {
    var markers = [];
    var source = this.markersById;
    this.collection.groupByCid.all().forEach(function (d) {
      if (d.value == 1 && source[d.key]) {
        if (cb)
          markers.push(cb(source[d.key]));
        else
          markers.push(source[d.key].getLocation());
      }
    });
    return markers;
  },

  isLoaded: function() {
    return this._loadStatus.map && this._loadStatus.tiles && this._loadStatus.tracks;
  }

})
