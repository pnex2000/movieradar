$(document).ready(function () {
  jQueryAjaxSetup()

  const $raterSelect = $('select[name=rater]')
  const $movieSelect = $('select[name=movie]')
  const $newRatingBtn = $('#rate-movie')
  const $raterInput = $('#rater-input')
  const $movieInput = $('#movie-input')
  const $movieDatalist = $('#movie-datalist')

  // TODO make a nicer package
  const drawChart = makeRadarChart('#chart')

  populateMovieAndUserSelections()
  addRatingSelectionHandlers()
  addNewRatingHandlers()
  showDemoRatings()

  function populateMovieAndUserSelections() {
    Bacon.combineTemplate({
      raters: getRatersE(),
      movies: getMoviesE()
    }).onValue(function (ratersMovies) {
      $raterSelect.append(optionsFromList(ratersMovies.raters))
      $movieSelect.append(optionsFromList(ratersMovies.movies))

      $movieDatalist.append(optionsFromList(ratersMovies.movies))
    })
  }

  // TODO update selections based on the other selection
  function addRatingSelectionHandlers() {
    const raterSelectionE = $raterSelect.asEventStream('change')
    const movieSelectionE = $movieSelect.asEventStream('change')

    raterSelectionE.merge(movieSelectionE)
      .filter(areSelectionsValid)
      .doAction(() => resetNewRating())
      .flatMapLatest(() => getRatingsE($movieSelect.val(), $raterSelect.val()))
      .doAction(() => $('#chart').fadeIn(250))
      .onValue(drawChart)

    function areSelectionsValid() {
      return $raterSelect.val().length > 0 && $movieSelect.val().length > 0
    }
  }

  function addNewRatingHandlers() {
    $newRatingBtn.asEventStream('click')
      .doAction(() => resetRatingSelection())
      .doAction(() => $('#new-rating-chart').hide())
      .onValue(() => $('#new-rating-input').show(250))

    const raterInputE = $raterInput.asEventStream('input cut paste')
    const movieInputE = $movieInput.asEventStream('input cut paste')

    const drawNewChart = makeRadarChart('#new-rating-chart')

    const canUserRateE = raterInputE.merge(movieInputE)
      .debounce(500)
      .filter(areUserAndMovieInputsValid)
      .flatMapLatest(() => getRatingsE($movieInput.val(), $raterInput.val()))

    canUserRateE.onValue(() => { showError(true); $('#new-rating-chart').hide() })

    canUserRateE
      .errors()
      .mapError(() => true)
      .doAction(() => showError(false))
      .doAction(() => $('#new-rating-chart').show(250))
      .flatMapLatest(() => drawNewChart(defaultRating($raterInput.val(), $movieInput.val()), true))
      .filter(areUserAndMovieInputsValid)
      .flatMapLatest(rating => saveRatingE($movieInput.val(), $raterInput.val(), rating))
      .onValue(res => console.log('saved stuff!', res))

    function areUserAndMovieInputsValid() {
      return $raterInput.val().length > 0 && $movieInput.val().length > 0
    }
    function showError(visible) {
      const $error = $('#new-rating-input .rating-error')
      if (visible) $error.show(250)
      else $error.hide(250)
    }
  }

  function showDemoRatings() {
    getRatingsE('Prometheus', 'giffis')
      //.combine(getRatingsE('Blade Runner', 'giffis'), '.concat')
      .onValue(drawChart)
  }

  function resetRatingSelection() {
    document.getElementById('rating-selection-form').reset()
    $('#chart').fadeOut(250)
  }
  function resetNewRating() {
    $('#new-rating-input').hide(250)
    $movieInput.val('')
  }

  function optionsFromList(list) {
    var frag = document.createDocumentFragment()
    list.forEach((item) => {
      var option = document.createElement('option')
      option.value = item
      option.text = item
      frag.appendChild(option)
    })
    return frag
  }
})

function getRatingsE(movie, user) {
  return Bacon.fromPromise($.ajax('/ratings/' + movie + '/user/' + user))
}

function getRatersE() {
  return Bacon.fromPromise($.ajax('/ratings/raters'))
}

function getMoviesE() {
  return Bacon.fromPromise($.ajax('/ratings/movies'))
}

function saveRatingE(movie, user, rating) {
  return Bacon.fromPromise($.ajax({url: '/ratings/' + movie + '/user/' + user,
                                   type: 'POST',
                                   data: rating}))
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
  }]
}

function makeRadarChart(parentSelector) {
  const width = 500, height = 500
  const colorscale = d3.scale.category10()
  const radarChart = RadarChart()
  var axisCount = undefined

  return drawChart

  function isAxisUpdateNeeded(newAxisCount) {
    if (axisCount !== newAxisCount) {
      axisCount = newAxisCount
      return true
    } else {
      return false
    }
  }

  function mapDisplayDataToSerial(data) {
    const mapping = {
      Plot: 'ratingPlot',
      Script: 'ratingScript',
      Hotness: 'ratingHotness',
      Sound: 'ratingSound',
      Visuality: 'ratingVisuality',
      Characters: 'ratingCharacters'
    }
    var out = {}
    data.forEach(rating => {
      out[mapping[rating.title]] = rating.value
    })
    return out
  }

  function drawChart(ratings, editable) {
    var legendTitles = ratings.map(rating => `${rating.movieName} (${rating.raterName})`)

    var data = ratings.map(rating => [
      {axis:'Plot',       value:rating.ratingPlot/10},
      {axis:'Script',     value:rating.ratingScript/10},
      {axis:'Hotness',    value:rating.ratingHotness/10},
      {axis:'Sound',      value:rating.ratingSound/10},
      {axis:'Visuality',  value:rating.ratingVisuality/10},
      {axis:'Characters', value:rating.ratingCharacters/10}
    ])

    if (isAxisUpdateNeeded(6))
      radarChart.reset(parentSelector, data, { w: width, maxValue: 1, levels: 6 })

    const updatesE = radarChart.draw(data, editable === true ? true : false)

    clearLegend(parentSelector)
    drawLegend(parentSelector, legendTitles, width)

    return updatesE
      .debounce(300)
      .map(data => {
        const scaledRatings = data.map(rating => ({ title: rating.title, value: Math.round(rating.value*10) }))
        return mapDisplayDataToSerial(scaledRatings)
      })

    function clearLegend(container) {
      d3.select(container)
        .selectAll('svg')
        .select('.radar-legend')
        .remove()
    }
    // TODO allow animating legend updates
    function drawLegend(container, legendTitles, width) {
      var legendGroup = d3.select(container)
	    .selectAll('svg')
	    .append('g')
            .attr('class', 'radar-legend')
            .attr('transform', svgTranslation(width - 70, 10))

      drawTitle(legendGroup)
      drawBoxes(legendGroup)
      drawEntries(legendGroup)

      function drawTitle(group) {
        group.append("text")
          .attr("class", "legend-title")
          .text("Ratings")
      }
      function drawBoxes(group) {
        group.selectAll('rect')
          .data(legendTitles)
          .enter()
          .append("rect")
          .attr("x", 3)
          .attr("y", function(d, i) { return i * 20 + 8 })
          .attr("width", 10)
          .attr("height", 10)
          .style("fill", function(d, i) { return colorscale(i) })
      }
      function drawEntries(group) {
        group.selectAll('.legend-entry')
          .data(legendTitles)
          .enter()
          .append("text")
          .attr("x", 18)
          .attr("y", function(d, i) { return i * 20 + 17 })
          .attr("class", "legend-entry")
          .text(function(d) { return d })
      }
    }
    function svgTranslation(x, y) {
      return 'translate(' + x + ',' + y + ')'
    }
  }
}

function jQueryAjaxSetup() {
  $.ajaxSetup({dataType: 'json', contentType: 'application/json; charset=utf-8'})
  $.ajaxPrefilter('json', function (opts, originalOpts) {
    if (opts.type.toLowerCase() !== 'get' &&
        typeof originalOpts.data !== 'string' &&
        !(originalOpts.data instanceof FormData)) {
      opts.data = JSON.stringify(originalOpts.data)
    }
  })
}
