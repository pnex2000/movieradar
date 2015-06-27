var pgrm = require('pg-using-bluebird')({dbUrl: 'postgres://localhost/movieradar'})

// public

function getRating(raterName, movieName) {
  return pgrm.queryAsync(
    'select rater_name, movie_name, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters from rating natural join rater natural join movie where rater_name=$1 and movie_name=$2', [raterName, movieName])
    .then(function(rows) {
      return rows.map(propertiesToCamel)
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
  getRating: getRating
}
