var config = require('./server/config.js'),
    express = require('express'),
    bodyParser = require('body-parser'),
    path = require('path'),
    morgan = require('morgan'),
    util = require('util')

var app = express()
app.use(morgan('combined'))

if (config.devEnv) {
  console.log('DEV MODE')
  app.use('/js', express.static(path.join(__dirname, 'front-js-src')))
}
app.use(express.static(path.join(__dirname, 'front')))

app.use(bodyParser.json({limit: 100 * 1024}))
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/', require('./server/routes/pages.js'))
app.use('/api/ratings', require('./server/routes/ratings.js'))

// If a request is unhandled at this point, assume its 404
app.use(function(req, res, next) {
  res.status(404).end()
})

var server = app.listen(config.port, function() {
  util.log('Express server listening on ' + server.address().address + ':' + server.address().port)
})
