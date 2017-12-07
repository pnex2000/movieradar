var config = require('../config.js'),
    BPromise = require('bluebird'),
    pgrm = require('pg-using-bluebird')({dbUrl: config.dbUrl})

// public

function getRating(raterName, movieName) {
  return pgrm.queryAsync(
    'select rater_name, movie_name, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters from rating natural join rater natural join movie where rater_name=$1 and movie_name=$2', [raterName, movieName])
    .then(function(rows) {
      return rows.map(propertiesToCamel)
    })
}

function getRatings(movieName, limit) {
  if (limit > 100) limit = 100
  else if (!limit || limit < 1) limit = 1

  return pgrm.queryAsync(
    'select rater_name, movie_name, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters from rating natural join rater natural join movie where movie_name=$1 limit $2', [movieName, limit])
    .then(function(rows) {
      return rows.map(propertiesToCamel)
    })
}

function getRandomRating() {
  return pgrm.queryAsync(
    'SELECT rater_name, movie_name, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters FROM rating NATURAL JOIN rater NATURAL JOIN movie WHERE movie_id=(SELECT movie_id FROM movie OFFSET floor(random()*(SELECT COUNT(*) FROM movie)) LIMIT 1)', [])
    .then(function(rows) {
      return rows.map(propertiesToCamel)
    })
}

function addRating(raterName, movieName, rating) {
  return BPromise.join(createOrGetUser(raterName), createOrGetMovie(movieName),
                       upsertRating)

  function upsertRating(raterUuid, movieId) {
    var i = {text: "INSERT INTO rating (rater_uuid, movie_id, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters) SELECT $1, $2, now(), $3, $4, $5, $6, $7, $8",
             values: [raterUuid, movieId, rating.ratingPlot, rating.ratingScript, rating.ratingHotness, rating.ratingSound, rating.ratingVisuality, rating.ratingCharacters]}

    var u = {text: "UPDATE rating SET rating_date=now(), rating_plot=$3, rating_script=$4, rating_hotness=$5, rating_sound=$6, rating_visuality=$7, rating_characters=$8 WHERE rater_uuid=$1 AND movie_id=$2",
             values: [raterUuid, movieId, rating.ratingPlot, rating.ratingScript, rating.ratingHotness, rating.ratingSound, rating.ratingVisuality, rating.ratingCharacters]}

    var ups = pgrm.createUpsertCTE('rating', 'rating_id', {insert: i, update: u})

    // TODO not yet using transactions, should add convenience method to pgrm
    return pgrm.queryAsync(ups.text, ups.values)
      .then(function (result) { return result.rows })
  }

  function createOrGetUser(raterName) {
    return pgrm.queryAsync("WITH s AS (SELECT rater_uuid FROM rater WHERE rater_name=$1), i AS (INSERT INTO rater (rater_name) SELECT $2 WHERE NOT EXISTS (SELECT 1 FROM s) RETURNING rater_uuid) SELECT rater_uuid FROM i UNION ALL SELECT rater_uuid FROM s", [raterName, raterName])
      .then(function (result) {
        return result[0].rater_uuid
      })
  }

  function createOrGetMovie(movieName) {
    return pgrm.queryAsync("WITH s AS (SELECT movie_id FROM movie WHERE movie_name=$1), i AS (INSERT INTO movie (movie_name) SELECT $2 WHERE NOT EXISTS (SELECT 1 FROM s) RETURNING movie_id) SELECT movie_id FROM i UNION ALL SELECT movie_id FROM s", [movieName, movieName])
      .then(function (result) {
        return result[0].movie_id
      })
  }
}

function getRaters() {
  return pgrm.queryAsync('select rater_name from rater')
    .then(function (rows) {
      return rows.map(function (row) { return row.rater_name })
    })
}

function getMovies() {
  return pgrm.queryAsync('select movie_name from movie')
    .then(function (rows) {
      return rows.map(function (row) { return row.movie_name })
    })
}

// Utilities

function propertiesToCamel(obj) {
  var newObj = {}
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) {
      continue
    }
    renameProperty(obj, newObj, prop, _ToCamel(prop))
  }
  return newObj

  function _ToCamel(str) {
    var words = str.split('_')
    return words.map(function (word, i) { return i > 0 ? capitalizeFirstLetter(word) : word }).join('')

    function capitalizeFirstLetter(word) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }
  }
  function renameProperty(src, trg, prop, newName) {
    if (prop !== newName) {
      trg[newName] = src[prop]
    }
  }
}

module.exports = {
  getRating: getRating,
  getRatings: getRatings,
  getRandomRating: getRandomRating,
  addRating: addRating,
  getRaters: getRaters,
  getMovies: getMovies
}
