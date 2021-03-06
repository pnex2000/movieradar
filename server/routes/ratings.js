var express = require('express'),
    BPromise = require('bluebird'),
    movieDb = require('../db/movie.js'),
    net = require('../net-utils.js')

var router = express.Router()

router.get('/random', function (req, res, next) {
  movieDb.getRandomRating()
    .then(function (ratings) { return ratings.length > 0 ? res.json(ratings) : res.status(404).end() })
    .catch(next)
})

router.get('/:movie/user/:user', function (req, res, next) {
  movieDb.getRating(req.params.user, req.params.movie)
    .then(function (ratings) { return ratings.length > 0 ? res.json(ratings) : res.status(404).end() })
    .catch(next)
})

router.get('/:movie/limit/:limit', function (req, res, next) {
  movieDb.getRatings(req.params.movie, req.params.limit)
    .then(function (ratings) { return ratings.length > 0 ? res.json(ratings) : res.status(404).end() })
    .catch(next)
})

router.post('/:movie/user/:user', function (req, res, next) {
  movieDb.addRating(req.params.user, req.params.movie, req.body)
    .then(net.respondWith204(res))
    .catch(next)
})

router.get('/raters', function (req, res, next) {
  movieDb.getRaters()
    .then(function (raters) { return res.json(raters) })
    .catch(next)
})

router.get('/movies', function (req, res, next) {
  movieDb.getMovies()
    .then(function (movies) { return res.json(movies) })
    .catch(next)
})

module.exports = router
