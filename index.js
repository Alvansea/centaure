'use strict'

const SchemaLoader = require('./lib/loader')

exports.connect = function(config, options) {
  return new SchemaLoader(config, options)
}