'use strict'

module.exports = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'centaure_dev',
    charset: 'utf8'
  },
  pool: { min: 2, max: 10 },
  debug: false,
  asyncStackTraces: true
}