'use strict'

const path = require('path')
const { expect } = require('chai')
const loader = require('../lib/loader')
const User = require('./assets/models/User')
const Book = require('./assets/models/Book')
const config = require('./assets/config')

describe('model initialization', () => {

  var db

  before(async () => {
    db = loader.connect(config, { debug: true })
  })

  it('should get loader', async () => {
    expect(db).exist
    expect(db.models).exist
    expect(db.options).exist
    expect(db.options.debug).equals(true)
  })

  it('should add models and init relations', async () => {

    db.addModel(User)
    db.addModel(Book)
    db.initRelations()

    expect(db.models.User).exist

    expect(db.models.User.relationMappings.books).exist

    expect(db.models.Book).exist
    expect(db.models.Book.relationMappings.author).exist
  })

  it('should scan folder', async () => {
    db.reset()
    db.scan(path.resolve('./test/assets/models/*.js'))

    expect(db.models.User).exist
    expect(db.models.User.relationMappings.books).exist

    expect(db.models.Book).exist
    expect(db.models.Book.relationMappings.author).exist
  })
})