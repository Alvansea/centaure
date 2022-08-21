'use strict'

const path = require('path')
const { expect } = require('chai')
const config = require('./assets/config')
const db = require('../lib/loader').connect(config, { debug: false })

const nonce = () => Math.random().toString().slice(2)

describe('query test', () => {

  const raw = {
    users: [
      { username: 'user_' + nonce() }
    ],
    books: [
      { name: 'book1_' + nonce() },
      { name: 'book2_' + nonce() },
      { name: 'book3_' + nonce() },
    ]
  }

  const pool = {
    users: [],
    books: []
  }

  before(async () => {
    db.scan(path.resolve('./test/assets/models/*.js'))
    pool.users = await Promise.all(raw.users.map(
      elem => db.models.User.create(elem)
    ))
    pool.books = await Promise.all(raw.books.map(
      elem => db.models.Book.create(Object.assign({ user_id: pool.users[0].id }, elem))
    ))
  })

  after(async () => {
    await db.models.User.deleteMany({ id: pool.users.map(i => i.id) })
    await db.models.Book.deleteMany({ id: pool.books.map(i => i.id) })
  })

  it('should populate for belongsTo relation', async () => {
    const books = await db.models.Book.find({
      id: pool.books.map(b => b.id)
    }).populate('author')
    books.forEach(book => {
      expect(book.author).exist
      expect(book.author.id).equals(pool.users[0].id)
    })
  })

  it('should populate for hasMany relation', async () => {
    const user = await db.models.User.findOne({
      id: pool.users[0].id
    }).populate('books')
    expect(user.books).exist
    expect(user.books.length).equals(pool.books.length)
  })
})