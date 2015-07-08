// Based on
// http://nbremer.blogspot.nl/2013/09/making-d3-radar-chart-look-bit-better.html
// which in turn is based on
// https://github.com/alangrafu/radar-chart-d3

var RadarChart = function () {

  const pi2 = 2 * Math.PI
  const Format = d3.format('%')

  var cfg = {}
  var axisCount
  var axes = []
  var radius
  var origin = {x: 0, y: 0}
  var container
  var tooltip

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
  function setRadius(rad) {
    radius = rad
    origin.x = origin.y = rad
  }
  function initAxes(count) {
    const axisAngle = pi2/axisCount
    axes = Array.from({length: count}, (val, idx) => {
      return { x: Math.sin(idx * axisAngle), y: Math.cos(idx * axisAngle) }
    })
  }
  function getNormalizedAxis(index) {
    const axis = axes[index]
    return { x: radius * (1 - axis.x) - radius, y: radius * (1 - axis.y) - radius }
  }

  // TODO polylines could be well suited for this
  function drawLevelLines(g, levels, radius, axisTitles) {
    const axisCount = axisTitles.length
    for (var j = 0; j < levels; j++) {
      var distanceFromOrigin = radius * (j+1)/levels
      g.selectAll(".levels")
        .data(axisTitles)
        .enter()
        .append("line")
        .attr("x1", (d, i) => distanceFromOrigin*(1-Math.sin(i*pi2/axisCount)))
        .attr("y1", (d, i) => distanceFromOrigin*(1-Math.cos(i*pi2/axisCount)))
        .attr("x2", (d, i) => distanceFromOrigin*(1-Math.sin((i+1)*pi2/axisCount)))
        .attr("y2", (d, i) => distanceFromOrigin*(1-Math.cos((i+1)*pi2/axisCount)))
        .attr("class", "level-line")
        .attr('transform', `translate(${radius-distanceFromOrigin}, ${radius-distanceFromOrigin})`)
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
        .attr('transform', `translate(${radius-levelFactor + leftPadding}, ${radius-levelFactor})`)
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
    elem.attr('transform', `translate(${cfg.marginX/2}, ${cfg.marginY/2})`)
  }

  function drawTooltip(g) {
    tooltip = g.append('text')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('font-family', 'sans-serif')
      .style('font-size', '13px')
  }

  function dragmove(d) {
    const point = d3.select(this)
    const g = d3.select(this.parentNode)
    const axisV = getNormalizedAxis(point.attr('data-axis'))
    const newCoord = constrainLength(origin, newPointOnAxis(origin, axisV, d3.event), axisV, radius)

    const newValue = distanceBetweenPoints(origin, newCoord) / radius
    point.attr('cx', newCoord.x)
    point.attr('cy', newCoord.y)
    point.attr('data-value', newValue)
    redrawPolygonToMatchTips(g, 0)

    function vMake(x, y) { return { x: x, y: y } }
    function vSub(a, b) { return { x: a.x-b.x, y: a.y-b.y } }
    function vAdd(a, b) { return { x: a.x+b.x, y: a.y+b.y } }
    function vMulS(a, s) { return { x: a.x*s, y: a.y*s } }
    function vLength(a) { return Math.sqrt(a.x*a.x + a.y*a.y) }
    // Project a onto b
    function vProjection(a, b) { return vMulS(b, vDot(a, b) / vDot(b, b)) }
    function vDot (a, b) { return a.x*b.x + a.y*b.y }

    function newPointOnAxis(origin, vAxis, offsetC) {
      const vOffset = vSub(offsetC, origin)
      return vAdd(origin, vProjection(vOffset, vAxis))
    }

    function constrainLength(origin, point, direction, maxLength) {
      const normalized = vSub(point, origin)
      const length = vLength(normalized)
      if (vDot(normalized, direction) <= 0) { return origin }
      if (length > maxLength) {
        const lengthFactor = maxLength / length
        return vAdd(origin, vMake(normalized.x * lengthFactor, normalized.y * lengthFactor))
      }
      return point
    }

    function distanceBetweenPoints(oldc, newc) {
      const diffv = vSub(newc, oldc)
      return vLength(diffv)
    }
  }

  const drag = d3.behavior.drag()
        .origin((d) => { const elem = d3.event.target; return { x: elem.getAttribute('cx'), y: elem.getAttribute('cy') }})
        .on('drag', dragmove)

  function redrawPolygonToMatchTips(g, series) {
    const circles = container.selectAll('svg #radar-data circle')
    const vertices = circles[0].map(svge => {return { x: svge.getAttribute('cx'), y: svge.getAttribute('cy') }})
    drawGraphPolygon(g, vertices, series, false)
  }

  function drawGraph(g, vertices, series, enableManipulation) {
    drawGraphPolygon(g, vertices, series, true)
    drawGraphTips(g, vertices, series, enableManipulation)
  }

  function drawGraphPolygon(g, vertices, series, animate) {
    var area = g.selectAll(`polygon.radar-chart-serie${series}`)
          .data([vertices])

    area.exit().transition().duration(500)
      .attr('points', d => d.reduce((prev, curr) => `${prev} 0,0`, ''))
      .remove()

    area.enter()
      .append('polygon')
      .attr('class', `radar-chart-serie${series}`)
      .style('stroke-width', '2px')
      .style('stroke', cfg.color(series))
      .style('fill', cfg.color(series))
      .style('fill-opacity', cfg.opacityArea)
      .on('mouseover', function (d) {
        var selected = 'polygon.' + d3.select(this).attr('class')

        g.selectAll('polygon').transition(200).style('fill-opacity', 0.1)

        g.selectAll(selected).transition(200).style('fill-opacity', .7)
      })
      .on('mouseout', function() {
        g.selectAll('polygon').transition(200).style('fill-opacity', cfg.opacityArea)
      })

    const initialSelection = animate ? area.transition().duration(500) : area
    initialSelection.attr('points', d => d.reduce((prev, curr) => `${prev} ${curr.x},${curr.y}`, ''))
  }

  function drawGraphTips(g, vertices, series, enableManipulation) {
    var tips = g.selectAll(`circle.radar-chart-serie${series}`)
          .data(vertices)

    tips.exit().remove()

    const enter = tips.enter()
      .append('circle')
      .attr('class', `radar-chart-serie${series}`)
      .attr('r', cfg.tipRadius)
      .attr('data-axis', (vertex, i) => i)
      .style('fill', cfg.color(series))
      .style('fill-opacity', .9)
      .on('mouseover', function (d) {
        const tip = d3.select(this)
        tooltip
          .attr('x', parseFloat(tip.attr('cx')) - 10)
          .attr('y', parseFloat(tip.attr('cy')) - 10)
          .text(Format(tip.attr('data-value') || d.value))
          .transition(200)
          .style('opacity', 1)

        const selected = 'polygon.' + tip.attr('class')

        g.selectAll('polygon').transition(200).style('fill-opacity', 0.1)

        g.selectAll(selected).transition(200).style('fill-opacity', .7)
      })
      .on('mouseout', function() {
        tooltip.transition(200).style('opacity', 0)

        g.selectAll('polygon').transition(200).style('fill-opacity', cfg.opacityArea)
      })

    if (enableManipulation) {
      enter.call(drag)
    }
    tips
      .transition().duration(500)
      .attr('cx', (vertex, i) => vertex.x )
      .attr('cy', (vertex, i) => vertex.y )
  }

  return {
    reset: function(containerId, data, options) {
      cfg = buildConfig(options)
      container = d3.select(containerId)

      var axisTitles = data[0].map(i => i.axis)
      axisCount = axisTitles.length
      setRadius(Math.min(cfg.w/2, cfg.h/2))
      initAxes(axisCount)

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
    draw: function(ratings, enableManipulation) {

      var svg = container.select('svg')

      // TODO look for adding elegance here, just a quick hack for now
      var g = svg.select('#radar-data')
      if (!g[0][0]) {
        g = svg.append('g').attr('id', 'radar-data')
        translateByMargin(g)
        drawTooltip(g)
      }

      const axisAngle = pi2/axisCount

      ratings.forEach(function(rating, idx) {
        const vertices = rating.map((subRating, i) => {return {x: radius * (1 - subRating.value * Math.sin(i*axisAngle)),
                                                               y: radius * (1 - subRating.value * Math.cos(i*axisAngle)),
                                                               value: subRating.value }})
        drawGraph(g, vertices, idx, enableManipulation)
      })
    }
  }
}
