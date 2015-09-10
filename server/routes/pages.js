var express = require('express')

router = express.Router()

router.get('/', function(req, res) {
  respondWithIndex(res)
})

router.get('/movie/:movieName', function(req, res) {
  respondWithIndex(res)
})

router.get('/movie/:movieName/reviewer/:reviewerName', function(req, res) {
  respondWithIndex(res)
})

router.get('/new-rating', function(req, res) {
  respondWithIndex(res)
})

function respondWithIndex(res) {
  res.sendFile('/front/index.html', { root: __dirname + '/../..' })
}

module.exports = router
