'use strict'

module.exports = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: '3306',
    user: 'tangxl',
    password: 'Tangxinli2014',
    database: 'centaure_dev',
    charset: 'utf8'
  },
  pool: { min: 2, max: 10 },
  debug: true,
  asyncStackTraces: true
}