'use strict'

module.exports = class Book {

  static get schema() {
    return {
      properties: {
        name: { type: String },
        deleted: { type: Boolean, default: false },
        created_at: { type: Date, default: () => new Date() },
        updated_at: { type: Date, default: () => new Date() },

        // FKs
        user_id: { type: Number },
      },
      belongsTo: {
        author: { key: 'user_id', ref: 'User' }
      }
    }
  }
}