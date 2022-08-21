'use strict'

const _ = require('underscore')
const Query = require('./query')

const __validateProperties = (params, props) => {
  const output = {}
  for (var key in props) {
    if (params[key] === undefined) {
      continue
    }
    if (params[key] === null) {
      if (props[key].required) {
        console.log(`Warning: property ${key} is required, but get null`)
      } else {
        output[key] = null
      }
      continue
    }
    switch (props[key].type) {
      case 'string':
        output[key] = params[key].toString()
        break
      case 'number':
        if (typeof (params[key]) == 'number') {
          output[key] = params[key]
        } else if (params[key].constructor == String) {
          output[key] = parseFloat(params[key]) || 0
        }
        break
      case 'boolean':
        output[key] = !!params[key]
        break
      case 'date':
        output[key] = new Date(params[key])
        break
      default:
        output[key] = params[key]
    }
  }
  return output
}

module.exports = function(Model) {

  return class extends Model {

    async save() {
      const params = __validateProperties(this, this.constructor.jsonSchema.properties)
      return await this.$query().patch(params)
    }

    async update(doc) {
      Object.assign(this, doc)
      return await this.save()
    }

    /**
     * expose getter properties to JSON
     */
    toJSON() {
      let jsonObj = null
      if (typeof (this.toObject) == 'function') {
        // jugglingdb model
        jsonObj = this.toObject(false, true)
      } else {
        jsonObj = Object.assign({}, this)
      }

      const props = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this))
      Object.entries(props)
        .filter(([key, descriptor]) => typeof descriptor.get == 'function')
        .map(([key, descriptor]) => {
          if (descriptor && key[0] !== '_') {
            try {
              const val = this[key]
              jsonObj[key] = val
            } catch (error) {
              console.error(`Error calling getter ${key}`, error)
            }
          }
        })

      return jsonObj
    }

    /* query helper methods */

    static create(...args) {
      const params = __validateProperties(Object.assign({}, ...args), this.jsonSchema.properties)
      return new Query('insert', super.query().insert(params))
    }

    static find(...args) {
      var query = new Query('select', super.query())
      if (args.length) {
        query = query.where(...args)
      }
      return query
    }

    static findOne(...args) {
      var query = new Query('select', super.query().findOne({}))
      if (args.length) {
        query = query.where(...args)
      }
      return query
    }

    static updateMany(filter, doc) {
      const params = __validateProperties(doc, this.jsonSchema.properties)
      var query = new Query('update', super.query().patch(params))
      if (filter) {
        query = query.where(filter)
      }
      return query
    }

    static updateOne(filter, doc) {
      var query = new Query('update', super.query().patch(doc).limit(1))
      if (filter) {
        query = query.where(filter)
      }
      return query
    }

    static deleteMany(...args) {
      var query = new Query('delete', super.query().delete())
      query = query.where(...args)
      return query
    }

    // Author: Objection does not support limit in delete method
    // static deleteOne(...args) {
    //   var query = new Query('delete', super.query().delete())
    //   query = query.where(...args).limit(1)
    //   return query
    // }

    static count(...args) {
      var query = new Query('count', super.query().count())
      query = query.where(...args)
      return query
    }
  }
}