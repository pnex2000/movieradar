$(document).ready(function () {
  var $raterSelect = $('select[name=rater]')
  var $movieSelect = $('select[name=movie]')

  Bacon.combineTemplate({
    raters: getRatersE(),
    movies: getMoviesE()
  }).onValue(function (ratersMovies) {
    $raterSelect.append(optionsFromList(ratersMovies.raters))
    $movieSelect.append(optionsFromList(ratersMovies.movies))
  })

  var raterSelectionE = $raterSelect.asEventStream('change')
  var movieSelectionE = $movieSelect.asEventStream('change')

  // TODO update selections based on the other selection

  raterSelectionE.merge(movieSelectionE)
    .filter(areSelectionsValid)
    .flatMapLatest(function () {
      return getRatingsE($movieSelect.val(), $raterSelect.val())
    })
    .onValue(makeRadarChart())

  //getRatingsE('Prometheus', 'giffis')
    //.combine(getRatingsE('Blade Runner', 'giffis'), '.concat')
    //.onValue(drawChart)

  function areSelectionsValid() {
    return $raterSelect.val().length > 0 && $movieSelect.val().length > 0
  }
})

function optionsFromList(list) {
  var frag = document.createDocumentFragment()
  list.forEach(function (item) {
    var option = document.createElement('option')
    option.value = item
    option.text = item
    frag.appendChild(option)
  })
  return frag
}

function getRatingsE(movie, user) {
  return Bacon.fromPromise($.ajax('/ratings/' + movie + '/user/' + user))
}

function getRatersE() {
  return Bacon.fromPromise($.ajax('/ratings/raters'))
}

function getMoviesE() {
  return Bacon.fromPromise($.ajax('/ratings/movies'))
}

function makeRadarChart() {
  const parentSelector = '#chart'
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

  function drawChart(ratings) {
    var legendTitles = ratings.map(rating => rating.movieName + ' (' + rating.raterName + ')')

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

    radarChart.draw(data, false)
    clearLegend(parentSelector)
    drawLegend(parentSelector, legendTitles, width)

    function clearLegend(container) {
      d3.select(container)
        .selectAll('svg')
        .select('#radar-legend')
        .remove()
    }
    // TODO allow animating legend updates
    function drawLegend(container, legendTitles, width) {
      var legendGroup = d3.select(container)
	    .selectAll('svg')
	    .append('g')
            .attr('id', 'radar-legend')
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
