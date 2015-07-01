var config = require('./server/config.js'),
    express = require('express'),
    path = require('path'),
    morgan = require('morgan'),
    util = require('util')

var app = express()
app.use(morgan('combined'))

app.use(express.static(path.join(__dirname, 'front')))

app.use('/ratings', require('./server/routes/ratings.js'))

// If a request is unhandled at this point, assume its 404
app.use(function(req, res, next) {
  res.status(404).end()
})

var server = app.listen(config.port, function() {
  util.log('Express server listening on ' + server.address().address + ':' + server.address().port)
})
