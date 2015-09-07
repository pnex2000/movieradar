'use strict';

$(document).ready(function () {
  jQueryAjaxSetup();

  var $raterSelect = $('select[name=rater]');
  var $movieSelect = $('select[name=movie]');
  var $newRatingBtn = $('#rate-movie');
  var $raterInput = $('#rater-input');
  var $movieInput = $('#movie-input');
  var $movieDatalist = $('#movie-datalist');

  // TODO make a nicer package
  var drawChart = makeRadarChart('#chart');

  var readyE = populateMovieAndUserSelections();

  addPopstateHandler();
  addRatingSelectionHandlers();
  addNewRatingHandlers();

  showPageOnLoad(readyE);

  function showPageOnLoad(readyE) {
    var urlParts = readUrl();
    var urlReadyE = readyE.map(function () {
      return urlParts;
    });
    if (urlParts.length === 0) {
      showRandomRating(urlReadyE);
    } else {
      parseUrlAndShow(urlReadyE);
    }
  }

  function readUrl() {
    return decodeURI(window.location.pathname).split('/').filter(function (part) {
      return part.length > 0;
    });
  }

  function urlForMovieAndRater(movie, rater) {
    var movieUrl = '/movie/' + movie;
    return rater && rater.length > 0 ? movieUrl + '/reviewer/' + rater : movieUrl;
  }

  function updateHistory(url) {
    history.pushState(undefined, undefined, url);
  }

  function populateMovieAndUserSelections() {
    var stream = Bacon.combineTemplate({
      raters: getRatersE(),
      movies: getMoviesE()
    }).doAction(function (ratersMovies) {
      $raterSelect.append(optionsFromList(ratersMovies.raters));
      $movieSelect.append(optionsFromList(ratersMovies.movies));
      $movieDatalist.append(optionsFromList(ratersMovies.movies));
    });
    return stream;
  }

  function addPopstateHandler() {
    var stream = $(window).asEventStream('popstate').map(readUrl);
    parseUrlAndShow(stream);
  }

  function parseUrlAndShow(urlE) {
    var stream = urlE.filter(function (urlParts) {
      return urlParts[0] === 'movie' && (!urlParts[2] || urlParts[2] === 'reviewer');
    }).map(function (urlParts) {
      return { movie: urlParts[1], rater: urlParts[3] };
    }).doAction(function (p) {
      $movieSelect.val(p.movie);$raterSelect.val(p.rater);
    });
    loadAndShowRatings(stream);
  }

  // TODO update selections based on the other selection
  function addRatingSelectionHandlers() {
    var raterSelectionE = $raterSelect.asEventStream('change');
    var movieSelectionE = $movieSelect.asEventStream('change');

    var selectionE = raterSelectionE.merge(movieSelectionE).filter(areSelectionsValid).doAction(function () {
      return resetNewRating();
    }).map(function () {
      return { movie: $movieSelect.val(), rater: $raterSelect.val() };
    }).doAction(function (p) {
      return updateHistory(urlForMovieAndRater(p.movie, p.rater));
    });

    loadAndShowRatings(selectionE);

    function areSelectionsValid() {
      return $movieSelect.val().length > 0;
    }
  }

  function loadAndShowRatings(eventStream) {
    eventStream.flatMapLatest(function (p) {
      return getRatingsE(p.movie, p.rater, 10);
    }).doAction(function () {
      return $('#chart').fadeIn(250);
    }).onValue(drawChart);
  }

  function addNewRatingHandlers() {
    $newRatingBtn.asEventStream('click').doAction(function () {
      return resetRatingSelection();
    }).doAction(function () {
      return $('#new-rating-chart').hide();
    }).onValue(function () {
      return $('#new-rating-input').show(250);
    });

    var raterInputE = $raterInput.asEventStream('input cut paste');
    var movieInputE = $movieInput.asEventStream('input cut paste');

    var drawNewChart = makeRadarChart('#new-rating-chart');

    var canUserRateE = raterInputE.merge(movieInputE).debounce(500).filter(areUserAndMovieInputsValid).flatMapLatest(function () {
      return getRatingsE($movieInput.val(), $raterInput.val());
    });

    canUserRateE.onValue(function () {
      showError(true);$('#new-rating-chart').hide();
    });

    canUserRateE.errors().mapError(function () {
      return true;
    }).doAction(function () {
      return showError(false);
    }).doAction(function () {
      return $('#new-rating-chart').show(250);
    }).flatMapLatest(function () {
      return drawNewChart(defaultRating($raterInput.val(), $movieInput.val()), true);
    }).filter(areUserAndMovieInputsValid).flatMapLatest(function (rating) {
      return saveRatingE($movieInput.val(), $raterInput.val(), rating);
    }).onValue(function (res) {
      return console.log('saved stuff!', res);
    });

    function areUserAndMovieInputsValid() {
      return $raterInput.val().length > 0 && $movieInput.val().length > 0;
    }
    function showError(visible) {
      var $error = $('#new-rating-input .rating-error');
      if (visible) $error.show(250);else $error.hide(250);
    }
  }

  function showRandomRating(readyE) {
    readyE.flatMapLatest(function () {
      return getRandomRatingE();
    }).onValue(drawChart);
  }

  function resetRatingSelection() {
    document.getElementById('rating-selection-form').reset();
    $('#chart').fadeOut(250);
  }
  function resetNewRating() {
    $('#new-rating-input').hide(250);
    $movieInput.val('');
  }

  function optionsFromList(list) {
    var frag = document.createDocumentFragment();
    list.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item;
      option.text = item;
      frag.appendChild(option);
    });
    return frag;
  }
});

function getRandomRatingE(movie, user) {
  return Bacon.fromPromise($.ajax('/api/ratings/random'));
}

function getRatingsE(movie, user, limit) {
  return user && user.length > 0 ? Bacon.fromPromise($.ajax('/api/ratings/' + movie + '/user/' + user)) : Bacon.fromPromise($.ajax('/api/ratings/' + movie + '/limit/' + limit));
}

function getRatersE() {
  return Bacon.fromPromise($.ajax('/api/ratings/raters'));
}

function getMoviesE() {
  return Bacon.fromPromise($.ajax('/api/ratings/movies'));
}

function saveRatingE(movie, user, rating) {
  return Bacon.fromPromise($.ajax({ url: '/api/ratings/' + movie + '/user/' + user,
    type: 'POST',
    data: rating }));
}

function defaultRating(rater, movie) {
  return [{
    raterName: rater,
    movieName: movie,
    ratingDate: new Date().toISOString(),
    ratingPlot: 5,
    ratingScript: 5,
    ratingHotness: 5,
    ratingSound: 5,
    ratingVisuality: 5,
    ratingCharacters: 5
  }];
}

function makeRadarChart(parentSelector) {
  var width = 500,
      height = 500;
  var colors = d3.scale.category10();
  var colorsEditable = d3.scale.ordinal().domain(Array.from({ length: 5 }, function (v, idx) {
    return idx;
  })).range(['#30ffff', '#30ffaa', '#30ff55', '#30aa33', '#306600']);
  var radarChart = RadarChart();
  var axisCount = undefined;

  return drawChart;

  function isAxisUpdateNeeded(newAxisCount) {
    if (axisCount !== newAxisCount) {
      axisCount = newAxisCount;
      return true;
    } else {
      return false;
    }
  }

  function mapDisplayDataToSerial(data) {
    var mapping = {
      Plot: 'ratingPlot',
      Script: 'ratingScript',
      Hotness: 'ratingHotness',
      Sound: 'ratingSound',
      Visuality: 'ratingVisuality',
      Characters: 'ratingCharacters'
    };
    var out = {};
    data.forEach(function (rating) {
      out[mapping[rating.title]] = rating.value;
    });
    return out;
  }

  // [{movieName, raterName}]
  function drawChart(ratings, editable) {
    var colorScale = editable ? colorsEditable : colors;
    var legendTitles = ratings.map(function (rating) {
      return '' + rating.raterName;
    });

    var data = ratings.map(function (rating) {
      return [{ axis: 'Plot', value: rating.ratingPlot / 10 }, { axis: 'Script', value: rating.ratingScript / 10 }, { axis: 'Hotness', value: rating.ratingHotness / 10 }, { axis: 'Sound', value: rating.ratingSound / 10 }, { axis: 'Visuality', value: rating.ratingVisuality / 10 }, { axis: 'Characters', value: rating.ratingCharacters / 10 }];
    });

    if (isAxisUpdateNeeded(6)) {
      radarChart.reset(parentSelector, data, { w: width, maxValue: 1, levels: 6, color: colorScale });
    }

    var updatesE = radarChart.draw(data, editable === true ? true : false);

    clearLegend(parentSelector);
    drawLegend(parentSelector, legendTitles, width);

    return updatesE.debounce(300).map(function (data) {
      var scaledRatings = data.map(function (rating) {
        return { title: rating.title, value: Math.round(rating.value * 10) };
      });
      return mapDisplayDataToSerial(scaledRatings);
    });

    function clearLegend(container) {
      d3.select(container).selectAll('svg').select('.radar-legend').remove();
    }
    // TODO allow animating legend updates
    function drawLegend(container, legendTitles, width) {
      var legendGroup = d3.select(container).selectAll('svg').append('g').attr('class', 'radar-legend').attr('transform', svgTranslation(width - 70, 10));

      drawTitle(legendGroup);
      drawBoxes(legendGroup);
      drawEntries(legendGroup);

      function drawTitle(group) {
        group.append("text").attr("class", "legend-title").text("Raters");
      }
      function drawBoxes(group) {
        group.selectAll('rect').data(legendTitles).enter().append("rect").attr("x", 3).attr("y", function (d, i) {
          return i * 20 + 8;
        }).attr("width", 10).attr("height", 10).style("fill", function (d, i) {
          return colorScale(i);
        });
      }
      function drawEntries(group) {
        group.selectAll('.legend-entry').data(legendTitles).enter().append("text").attr("x", 18).attr("y", function (d, i) {
          return i * 20 + 17;
        }).attr("class", "legend-entry").text(function (d) {
          return d;
        });
      }
    }
    function svgTranslation(x, y) {
      return 'translate(' + x + ',' + y + ')';
    }
  }
}

function jQueryAjaxSetup() {
  $.ajaxSetup({ dataType: 'json', contentType: 'application/json; charset=utf-8' });
  $.ajaxPrefilter('json', function (opts, originalOpts) {
    if (opts.type.toLowerCase() !== 'get' && typeof originalOpts.data !== 'string' && !(originalOpts.data instanceof FormData)) {
      opts.data = JSON.stringify(originalOpts.data);
    }
  });
}