'use strict'

const { expect } = require('chai')
const config = require('./assets/config')
const knex = require('knex')(config)
const user = require('../migrations/20220113222623_create_users_table')
const book = require('../migrations/20220115053503_create_book_table')

describe('knex test suites', () => {
  it('should query users', async () => {
    const users = await knex.select().table('user').limit(1)
    console.log('users', users)
  })

  it('should auto_migrate user table', async () => {
    await user.down(knex)
    await user.up(knex)
    await book.down(knex)
    await book.up(knex)
  })
})