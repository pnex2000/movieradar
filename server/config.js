
var config = {
  devEnv: process.env.NODE_ENV === 'development',
  dbUrl: process.env.DATABASE_URL || 'postgres://localhost/movieradar',
  port: process.env.PORT || 6789
}

module.exports = config
