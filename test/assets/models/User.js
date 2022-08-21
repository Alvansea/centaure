'use strict'

module.exports = class User {

  static get schema() {
    return {
      properties: {
        username: { type: String },
        deleted: { type: Boolean, default: false },
      },
      hasMany: {
        books: { key: 'user_id', ref: 'Book', },
      }
    }
  }
}