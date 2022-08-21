'use strict'

const path = require('path')
const { expect } = require('chai')
const config = require('./assets/config')
const db = require('../lib/loader').connect(config, { debug: false })

const nonce = () => Math.random().toString().slice(2)

describe('query test', () => {

  const raw = {
    users: [
      { username: 'user_' + nonce(), foo: 'bar' }
    ],
    books: [
      { name: 'book1_' + nonce(), foo: 'bar' },
      { name: 'book2_' + nonce(), foo: 'bar' },
      { name: 'book3_' + nonce(), foo: 'bar' },
    ]
  }

  const pool = {
    users: [],
    books: []
  }

  before(async () => {
    db.scan(path.resolve('./test/assets/models/*.js'))

  })

  after(async () => {
    await db.models.User.deleteMany({ id: pool.users.map(i => i.id) })
    await db.models.Book.deleteMany({ id: pool.books.map(i => i.id) })
  })

  it('should create document', async () => {
    pool.users = await Promise.all(raw.users.map(
      elem => db.models.User.create(elem)
    ))
    expect(pool.users).exist
    expect(pool.users.length).equals(raw.users.length)

    pool.books = await Promise.all(raw.books.map(async elem => {
      const book = await db.models.Book.create(Object.assign({ user_id: pool.users[0].id }, elem))
      expect(book.exist)
      expect(book.name).equals(elem.name)
      expect(book.deleted).equals(false)
      return book
    }))
    expect(pool.books).exist
    expect(pool.books.length).equals(raw.books.length)
  })

  it('should query successfully', async () => {
    const books = await db.models.Book.find({})
    expect(books.exist)
    expect(books.length).equals(raw.books.length)

    for (var i in raw.books) {
      const book = await db.models.Book.findOne({ name: raw.books[i].name })
      expect(book).exist
      expect(book.name).equals(raw.books[i].name)
    }
  })

  it('should update many', async () => {
    const newName = 'new book ' + nonce()
    const res = await db.models.Book.updateMany({
      id: pool.books.map(e => e.id)
    }, {
      name: newName,
      foo: 'bar'
    })
    expect(res).equals(pool.books.length)

    const books = await db.models.Book.find({ id: pool.books.map(e => e.id) })
    expect(books).exist
    expect(books.length).equals(pool.books.length)
    for (var i in books) {
      expect(books[i].name).equals(newName)
    }
  })

  it('should update one', async () => {
    const newName = 'new book ' + nonce()
    const res = await db.models.Book.updateOne({
      id: pool.books.map(i => i.id)
    }, {
      name: newName
    })
    expect(res).equals(1)

    const books = await db.models.Book.find({ name: newName })
    expect(books).exist
    expect(books.length).equals(1)
  })

  it('should count', async () => {
    const userCount = await db.models.User.count({ id: pool.users.map(e => e.id) })
    expect(userCount).equals(pool.users.length)

    const bookCount = await db.models.Book.count({ id: pool.books.map(e => e.id) })
    expect(bookCount).equals(pool.books.length)
  })

  it('should instance save work', async () => {
    const newName = 'new book ' + nonce()
    const book = await db.models.Book.findOne({ id: pool.books.map(e => e.id) })
    book.name = newName
    book.foo = 'bar' // custom property not defined in schema
    await book.save()

    const books = await db.models.Book.find({ name: newName })
    expect(books).exist
    expect(books.length).equals(1)
  })

  it('should instance update work', async () => {
    const newName = 'new book ' + nonce()
    const now = new Date()
    const book = await db.models.Book.findOne({ id: pool.books.map(e => e.id) })
    await book.update({
      name: newName,
      foo: 'bar', // custom property not defined in schema
      updated_at: now
    })

    const books = await db.models.Book.find({ name: newName })
    expect(books).exist
    expect(books.length).equals(1)
    for (var i in books) {
      expect(books[i].updated_at - now).equals(0)
      expect(books[i].updated_at - books[i].created_at).above(0)
    }
  })

  it('should delete many', async () => {
    const res = await db.models.Book.deleteMany({
      id: pool.books.map(i => i.id)
    })
    expect(res).equals(3)

    const res2 = await db.models.Book.find({
      id: pool.books.map(i => i.id)
    })
    expect(res2.length).equals(0)
  })
})