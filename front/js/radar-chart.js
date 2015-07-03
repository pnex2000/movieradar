// Based on
// http://nbremer.blogspot.nl/2013/09/making-d3-radar-chart-look-bit-better.html
// which in turn is based on
// https://github.com/alangrafu/radar-chart-d3

var RadarChart = function () {

  const pi2 = 2 * Math.PI
  const Format = d3.format('%')

  var cfg = {}
  var axisCount
  var radius
  var container

  function buildConfig(customCfg) {
    var cfg = {
      tipRadius: 6,
      w: 600,
      h: 600,
      levels: 4,
      maxValue: 1,
      opacityArea: 0.5,
      marginX: 70,
      marginY: 70,
      color: d3.scale.category10()
    }
    if ('undefined' !== typeof customCfg) {
      for (var i in customCfg) {
        if ('undefined' !== typeof customCfg[i]) {
          cfg[i] = customCfg[i]
        }
      }
    }
    return cfg
  }

  // TODO polylines could be well suited for this
  function drawLevelLines(g, levels, radius, axisTitles) {
    const axisCount = axisTitles.length
    for (var j = 0; j < levels; j++) {
      var distanceFromOrigin = radius * ((j+1)/levels)
      g.selectAll(".levels")
        .data(axisTitles)
        .enter()
        .append("line")
        .attr("x1", (d, i) => distanceFromOrigin*(1-Math.sin(i*pi2/axisCount)))
        .attr("y1", (d, i) => distanceFromOrigin*(1-Math.cos(i*pi2/axisCount)))
        .attr("x2", (d, i) => distanceFromOrigin*(1-Math.sin((i+1)*pi2/axisCount)))
        .attr("y2", (d, i) => distanceFromOrigin*(1-Math.cos((i+1)*pi2/axisCount)))
        .attr("class", "level-line")
        .attr("transform", "translate(" + (radius-distanceFromOrigin) + ", " + (radius-distanceFromOrigin) + ")");
    }
  }

  function drawLevelTitles(g, levels, radius, maxValue) {
    const leftPadding = 5
    for (var j = 0; j < levels; j++) {
      var levelFactor = radius*((j+1)/levels)
      g.append("text")
        .attr("x", levelFactor)
        .attr("y", 0)
        .attr("class", "level-title")
        .attr("transform", "translate(" + (radius-levelFactor + leftPadding) + ", " + (radius-levelFactor) + ")")
        .text(Format((j+1) * maxValue/levels))
    }
  }

  function drawAxes(g, radius, axisTitles) {
    const factorLegend = .87
    const axisCount = axisTitles.length
    var axis = g.selectAll(".axis")
          .data(axisTitles)
          .enter()
          .append("g")
          .attr("class", "axis")

    axis.append("line")
      .attr("x1", radius)
      .attr("y1", radius)
      .attr("x2", (d, i) => radius*(1-Math.sin(i*pi2/axisCount)))
      .attr("y2", (d, i) => radius*(1-Math.cos(i*pi2/axisCount)))
      .attr("class", "axis-line")

    axis.append("text")
      .attr("class", "axis-title")
      .text(d => d)
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .attr("transform", "translate(0, -10)")
      .attr("x", (d, i) => radius*(1-factorLegend*Math.sin(i*pi2/axisCount)) - 60*Math.sin(i*pi2/axisCount))
      .attr("y", (d, i) => radius*(1-Math.cos(i*pi2/axisCount)) - 20*Math.cos(i*pi2/axisCount))
  }
  function translateByMargin(elem) {
    elem.attr("transform", "translate("+ cfg.marginX/2 +","+ cfg.marginY/2 +")")
  }

  return {
    reset: function(containerId, data, options) {
      cfg = buildConfig(options)
      container = d3.select(containerId)

      var axisTitles = data[0].map(i => i.axis)
      axisCount = axisTitles.length
      radius = Math.min(cfg.w/2, cfg.h/2)

      container.select('svg').remove()

      // Add padding and translate to make space for legends
      var svg = container
            .append("svg")
            .attr("width", cfg.w + cfg.marginX)
            .attr("height", cfg.h + cfg.marginY)

      var g = svg
            .append('g')
            .attr('id', 'radar-axes')
      translateByMargin(g)

      drawLevelLines(g, cfg.levels, radius, axisTitles)
      drawLevelTitles(g, cfg.levels, radius, cfg.maxValue)
      drawAxes(g, radius, axisTitles)

      return this
    },
    draw: function(data) {

      var svg = container.select('svg')

      // TODO look for adding elegance here, just a quick hack for now
      var g = svg.select('#radar-data')
      if (!g[0][0]) {
        g = svg.append('g').attr('id', 'radar-data')
        translateByMargin(g)
      }

      // TODO the following needs tidying up
      var series = 0;

      data.forEach(function(rating) {
        const axisAngle = pi2/axisCount
        const vertices = rating.map((subRating, i) => {return {x: radius * (1-subRating.value*Math.sin(i*axisAngle)),
                                                               y: radius * (1-subRating.value*Math.cos(i*axisAngle)),
                                                               value: subRating.value }})

        var area = g.selectAll('polygon')
          .data([vertices])

        area.exit().transition().duration(500)
          .attr('points', d => d.reduce((prev, curr) => { return prev + ' 0,0' }, ''))
          .remove()

        area.enter()
          .append("polygon")
          .attr("class", "radar-chart-serie"+series)
          .style("stroke-width", "2px")
          .style("stroke", cfg.color(series))
          .style("fill", d => cfg.color(series))
          .style("fill-opacity", cfg.opacityArea)
          .on('mouseover', function (d) {
            var selected = "polygon." + d3.select(this).attr("class")

            g.selectAll("polygon").transition(200).style("fill-opacity", 0.1)

            g.selectAll(selected).transition(200).style("fill-opacity", .7)
          })
          .on('mouseout', function() {
            g.selectAll("polygon").transition(200).style("fill-opacity", cfg.opacityArea)
          })

        area
          .transition().duration(500)
          .attr('points', d => d.reduce((prev, curr) => { return prev + ' ' + curr.x + ',' + curr.y }, ''))

        // Tips of the polygon

        var tips = g.selectAll('circle')
              .data(vertices)

        tips.exit().remove()
        
        tips.enter()
          .append('circle')
          .attr('class', 'radar-chart-serie'+series)
          .attr('r', cfg.tipRadius)
          .attr('alt', subRating => subRating.value)
          .style('fill', cfg.color(series)).style('fill-opacity', .9)
          .on('mouseover', function (d) {
            var newX = parseFloat(d3.select(this).attr('cx')) - 10;
            var newY = parseFloat(d3.select(this).attr('cy')) - 5;
            tooltip
              .attr('x', newX)
              .attr('y', newY)
              .text(Format(d.value))
              .transition(200)
              .style('opacity', 1)

            var selected = "polygon." + d3.select(this).attr("class")

            g.selectAll("polygon").transition(200).style("fill-opacity", 0.1)

            g.selectAll(selected).transition(200).style("fill-opacity", .7)
          })
          .on('mouseout', function() {
            tooltip.transition(200).style('opacity', 0)

            g.selectAll("polygon").transition(200).style("fill-opacity", cfg.opacityArea)
          })
          .append("svg:title")
          .text(function(j){return Math.max(j.value, 0)});

        tips
          .transition().duration(500)
          .attr('cx', (vertex, i) => vertex.x )
          .attr('cy', (vertex, i) => vertex.y )

        series++
      })

      // TODO do only once
      var tooltip = g.append('text')
            .attr("class", 'tooltip')
            .style('opacity', 0)
            .style('font-family', 'sans-serif')
            .style('font-size', '13px')
    }
  }
}
