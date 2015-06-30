var express = require('express'),
    BPromise = require('bluebird'),
    movieDb = require('../db/movie.js')

var router = express.Router()

router.get('/:movie/user/:user', function (req, res, next) {
  movieDb.getRating(req.params.user, req.params.movie)
    .then(function (ratings) { return res.json(ratings) })
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
