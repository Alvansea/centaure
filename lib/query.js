'use strict'

const _ = require('underscore')
const { inspect } = require('util')

module.exports = class Query {

  constructor(type, query, options) {

    this.type = type
    this.query = query
    this.filter = {}

    this.selects = []
    this.unselects = []

    this.options = Object.assign({}, options)

    this.pageOptions = ({
      page: 1,
      limit: 10
    })
  }

  get notations() {
    return {
      '$gt': '>',
      '$gte': '>=',
      '$lt': '<',
      '$lte': '<=',
      '$like': 'like',
      '$ne': '<>',
      '$in': 'in',
    }
  }

  then() {
    const promise = this.exec()
    return promise.then(...arguments)
  }

  catch() {
    const promise = this.exec()
    return promise.catch(...arguments)
  }

  where(...args) {
    Object.assign(this.filter, ...args)
    return this
  }

  _stringifyPopulate(params) {
    if (params.constructor == String) {
      return params
    }
    if (params instanceof Array) {
      return `[${params.map(param => this._stringifyPopulate(param)).join(',')}]`
    }
    if (params.path) {
      if (params.populate) {
        return `${params.path}.${this._stringifyPopulate(params.populate)}`
      } else {
        return `${params.path}`
      }
    }
    return ''
  }

  populate(params) {
    var graphs = this._stringifyPopulate(params)
    this.query = this.query.withGraphFetched(graphs)
    return this
  }

  select(params) {
    if (this.type != 'select') {
      throw new Error(`Invalid 'select' for operation ${this.type}`)
    }
    var arr = []
    if (params.constructor == String) {
      arr = params.split(' ')
    } else if (params instanceof Array) {
      arr = params
    } else {
      arr = [params]
    }

    arr.forEach(elem => {
      if (elem[0] == '-') {
        this.unselects.push(elem.slice(1))
      } else {
        this.selects.push(elem)
      }
    })

    return this
  }

  sort(params) {
    var arr = []
    if (!params) {
      throw new Error('Invalid parameter of sort')
    }
    if (params.constructor == String) {
      arr = params.split(' ')
    } else if (params.constructor == Array) {
      arr = params
    } else {
      throw new Error('Invalid parameter of sort')
    }
    arr.map(elem => {
      if (elem[0] == '-') {
        return [elem.slice(1), 'DESC']
      } else {
        return [elem, 'ASC']
      }
    }).forEach(elem => {
      this.query = this.query.orderBy(...elem)
    })

    return this
  }

  limit(num) {
    this.query = this.query.limit(num)
    this.pageOptions.limit = parseInt(num)
    return this
  }

  _parseFilter(key, val) {
    if (!key) {
      const arr = Object.keys(val)
      if (arr.length == 1) {
        return this._parseFilter(arr[0], val[arr[0]])
      } else {
        return {
          'and': arr.map(i => this._parseFilter(i, val[i]))
        }
      }
    } else if (key.slice(0, 3) == '$or') {
      return {
        'or': val.map(elem => this._parseFilter(null, elem))
      }
    } else {
      const tree = []
      if (val !== null) {
        Object.keys(this.notations).forEach(i => {
          if (val[i] !== undefined) {
            if (val[i] === null && i == '$ne') {
              tree.push([key, 'is not', null])
            } else {
              tree.push([key, this.notations[i], val[i]])
            }
          }
        })
      }
      if (!tree.length) {
        if (val === null) {
          return [key, 'is', null]
        } else if (val && val.constructor == Array) {
          if (val.indexOf(null) >= 0) {
            return {
              or: [
                [key, 'in', val],
                [key, 'is', null]
              ]
            }
          } else {
            return [key, 'in', val]
          }
        } else {
          return [key, val]
        }
      } else if (tree.length == 1) {
        return tree[0]
      } else {
        return { 'and': tree }
      }
    }
  }

  _buildQuery(query, tree, method) {
    method = method || 'where'
    if (tree.and) {
      if (method == 'where') {
        tree.and.forEach(elem => {
          query = this._buildQuery(query, elem, 'where')
        })
      } else { // method == orWhere
        query = query[method](builder => {
          tree.and.forEach(elem => {
            builder = this._buildQuery(builder, elem, 'where')
          })
        })
      }
    } else if (tree.or) {
      if (method == 'orWhere') {
        tree.or.forEach(elem => {
          query = this._buildQuery(query, elem, 'orWhere')
        })
      } else { // method == where
        query = query[method](builder => {
          tree.or.forEach(elem => {
            builder = this._buildQuery(builder, elem, 'orWhere')
          })
        })
      }
    } else {
      query = query[method](...tree)
    }
    return query
  }

  _preQuery() {

    if (Object.keys(this.filter).length) {
      const tree = this._parseFilter(null, this.filter)
      this.query = this._buildQuery(this.query, tree)
    }

    if (this.type == 'select') {
      if (this.selects.length) {
        const attrs = this.selects.filter(attr => attr.constructor == String)
        if (attrs.length == 0) {
          this.query = this.query.select('*')
        }
        this.query = this.query.select(...this.selects)
      } else if (this.unselects.length) {
        this.query = this.query.select('*')
      }
    }
  }

  _postQuery(data) {
    if (this.type == 'count') {
      return data[0]['count(*)']
    }
    if (this.type != 'select') {
      return data
    }
    if (!data || !this.unselects.length) {
      return data
    }
    if (data.constructor == Array) {
      return data.map(elem => _.omit(elem, this.unselects))
    } else {
      return _.omit(data, this.unselects)
    }
  }

  async exec() {
    this._preQuery()
    var data = await this.query
    data = this._postQuery(data)
    return data
  }

  async paginate(params) {
    params = params || {}
    const pagination = {
      page: parseInt(params.page) || this.pageOptions.page,
      limit: parseInt(params.limit) || this.pageOptions.limit,
      count: 0
    }
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit - 1

    this._preQuery()
    const data = await this.query.range(start, end)
    pagination.count = data.total
    return [this._postQuery(data.results), pagination]
  }
}