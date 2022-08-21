'use strict'

const path = require('path')
const glob = require('glob')
const chalk = require('chalk')
const { Model } = require('objection')
const Knex = require('knex')

const mixin = require('./model')

module.exports = class Schema {

  constructor(config, options) {
    this.knex = Knex(config)

    this.reset()

    this.options = Object.assign({}, options)
    this.options.debug && this._log('connect by knex', config)

    Model.knex(this.knex)
  }

  static connect(config, options) {
    return new Schema(config, options)
  }

  get models() {
    return this._models
  }

  scan(pattern) {
    const files = glob.sync(pattern)
    files.forEach(file => {
      this.addModel(require(file))
    })
    this.initRelations()
    return this
  }

  migrate() {
    this.models.forEach(model => {

    })
  }

  reset() {
    this._models = {}
    this._hasMany = {}
    this._belongsTo = {}
  }

  _log(...args) {
    console.log('Centaure >', ...args)
  }

  parseProperties(props) {
    const newProps = Object.assign({}, props)
    for (const name in newProps) {
      const prop = newProps[name]
      switch (prop.type) {
        case String:
          prop.type = 'string'
          break
        case Number:
          prop.type = 'number'
          break
        case Boolean:
          prop.type = 'boolean'
          break
        case Date:
          prop.type = 'date'
          break
        default:
          prop.type = 'unexisting-type'
          break;
      }
    }
    return newProps
  }

  addModel(base) {

    if (!base || !base.name) {
      return this._log('missing model name')
    }
    if (!base.schema) {
      return this._log('missing schema', chalk.bold.red(modelName))
    }

    const modelName = base.name
    const { properties, hasMany, belongsTo } = base.schema

    if (this._models[modelName]) {
      return this._log('model name conflicted:', chalk.bold.red(modelName))
    }
    if (hasMany) {
      this._hasMany[modelName] = hasMany
    }
    if (belongsTo) {
      this._belongsTo[modelName] = belongsTo
    }

    const tableName = modelName.toLowerCase()
    const jsonSchema = {
      type: 'object',
      properties: this.parseProperties(properties)
    }

    const model = class extends mixin(Model) {
      static get tableName() {
        return tableName
      }
      static get jsonSchema() {
        return jsonSchema
      }
    }

    // copy static properties & methods
    Object.getOwnPropertyNames(base)
      .filter(name => {
        return ['prototype', 'name', 'length', 'schema'].indexOf(name) < 0
      })
      .forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(base, name)
        Object.defineProperty(model, name, desc)
      })

    // copy instance properties & methods
    Object.getOwnPropertyNames(base.prototype)
      .filter(name => {
        return name != 'constructor'
      })
      .forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(base.prototype, name)
        Object.defineProperty(model.prototype, name, desc)
      })

    this._models[modelName] = model
    return model
  }

  initRelations() {
    // init hasMany relations
    Object.keys(this._hasMany).forEach(name => {
      const mappings = this._hasMany[name];
      if (!mappings) {
        return
      }
      const source = this._models[name]
      Object.keys(mappings).forEach(alias => {
        const rel = mappings[alias]
        const target = this._models[rel.ref]
        const fk = rel.key
        if (!target) {
          this._log('relation model ' + chalk.bold.red(rel.ref) + ' not found');
        }
        if (!fk) {
          this._log('relation model ' + chalk.bold.red(rel.ref) + ' not found');
        }
        if (target && rel.key) {
          source.relationMappings = source.relationMappings || {}
          Object.assign(source.relationMappings, {
            [alias]: {
              relation: Model.HasManyRelation,
              modelClass: target,
              join: {
                from: `${target.tableName}.${fk}`,
                to: `${source.tableName}.id`
              }
            }
          })
        }
      })
    })

    // init belongsTo relations
    Object.keys(this._belongsTo).forEach(name => {
      const mappings = this._belongsTo[name];
      if (!mappings) {
        return
      }
      const source = this._models[name]
      Object.keys(mappings).forEach(alias => {
        const rel = mappings[alias]
        const target = this._models[rel.ref]
        const fk = rel.key
        if (!target) {
          this._log('relation model ' + chalk.bold.red(rel.ref) + ' not found');
        }
        if (!fk) {
          this._log('relation model ' + chalk.bold.red(rel.ref) + ' not found');
        }
        if (target && rel.key) {
          source.relationMappings = source.relationMappings || {}
          Object.assign(source.relationMappings, {
            [alias]: {
              relation: Model.BelongsToOneRelation,
              modelClass: target,
              join: {
                from: `${source.tableName}.${fk}`,
                to: `${target.tableName}.id`
              }
            }
          })
        }
      })
    })
  }
}