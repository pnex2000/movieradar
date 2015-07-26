// Based on
// http://nbremer.blogspot.nl/2013/09/making-d3-radar-chart-look-bit-better.html
// which in turn is based on
// https://github.com/alangrafu/radar-chart-d3

'use strict';

var RadarChart = function RadarChart() {

  var pi2 = 2 * Math.PI;
  var Format = d3.format('%');

  var cfg = {};
  var axisCount;
  var axes = [];
  var radius;
  var origin = { x: 0, y: 0 };
  var container;
  var tooltip;

  var graphUpdated = function graphUpdated() {};
  var graphUpdatesE = Bacon.fromBinder(function (sink) {
    graphUpdated = sink;
    return function () {
      graphUpdated = function () {};
    };
  });

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
    };
    if ('undefined' !== typeof customCfg) {
      for (var i in customCfg) {
        if ('undefined' !== typeof customCfg[i]) {
          cfg[i] = customCfg[i];
        }
      }
    }
    return cfg;
  }
  function setRadius(rad) {
    radius = rad;
    origin.x = origin.y = rad;
  }
  function initAxes(axisTitles) {
    var axisAngle = pi2 / axisCount;
    axes = axisTitles.map(function (val, idx) {
      return { x: Math.sin(idx * axisAngle), y: Math.cos(idx * axisAngle), title: val };
    });
  }
  function getNormalizedAxis(index) {
    var axis = axes[index];
    return { x: radius * (1 - axis.x) - radius, y: radius * (1 - axis.y) - radius };
  }
  function getAxisTitle(index) {
    return axes[index]['title'];
  }

  // TODO polylines could be well suited for this
  function drawLevelLines(g, levels, radius, axisTitles) {
    var axisCount = axisTitles.length;
    for (var j = 0; j < levels; j++) {
      var distanceFromOrigin = radius * (j + 1) / levels;
      g.selectAll(".levels").data(axisTitles).enter().append("line").attr("x1", function (d, i) {
        return distanceFromOrigin * (1 - Math.sin(i * pi2 / axisCount));
      }).attr("y1", function (d, i) {
        return distanceFromOrigin * (1 - Math.cos(i * pi2 / axisCount));
      }).attr("x2", function (d, i) {
        return distanceFromOrigin * (1 - Math.sin((i + 1) * pi2 / axisCount));
      }).attr("y2", function (d, i) {
        return distanceFromOrigin * (1 - Math.cos((i + 1) * pi2 / axisCount));
      }).attr("class", "level-line").attr('transform', 'translate(' + (radius - distanceFromOrigin) + ', ' + (radius - distanceFromOrigin) + ')');
    }
  }

  function drawLevelTitles(g, levels, radius, maxValue) {
    var leftPadding = 5;
    for (var j = 0; j < levels; j++) {
      var levelFactor = radius * ((j + 1) / levels);
      g.append("text").attr("x", levelFactor).attr("y", 0).attr("class", "level-title").attr('transform', 'translate(' + (radius - levelFactor + leftPadding) + ', ' + (radius - levelFactor) + ')').text(Format((j + 1) * maxValue / levels));
    }
  }

  function drawAxes(g, radius, axisTitles) {
    var factorLegend = .87;
    var axisCount = axisTitles.length;
    var axis = g.selectAll(".axis").data(axisTitles).enter().append("g").attr("class", "axis");

    axis.append("line").attr("x1", radius).attr("y1", radius).attr("x2", function (d, i) {
      return radius * (1 - Math.sin(i * pi2 / axisCount));
    }).attr("y2", function (d, i) {
      return radius * (1 - Math.cos(i * pi2 / axisCount));
    }).attr("class", "axis-line");

    axis.append("text").attr("class", "axis-title").text(function (d) {
      return d;
    }).attr("text-anchor", "middle").attr("dy", "1.5em").attr("transform", "translate(0, -10)").attr("x", function (d, i) {
      return radius * (1 - factorLegend * Math.sin(i * pi2 / axisCount)) - 60 * Math.sin(i * pi2 / axisCount);
    }).attr("y", function (d, i) {
      return radius * (1 - Math.cos(i * pi2 / axisCount)) - 20 * Math.cos(i * pi2 / axisCount);
    });
  }
  function translateByMargin(elem) {
    elem.attr('transform', 'translate(' + cfg.marginX / 2 + ', ' + cfg.marginY / 2 + ')');
  }

  function drawTooltip(g) {
    tooltip = g.append('text').attr('class', 'tooltip').style('opacity', 0).style('font-family', 'sans-serif').style('font-size', '13px');
  }

  function dragmove(d) {
    var _this = this;

    var point = d3.select(this);
    var group = d3.select(this.parentNode);
    var axisV = getNormalizedAxis(point.attr('data-axis'));
    var newCoord = constrainLength(origin, newPointOnAxis(origin, axisV, d3.event), axisV, radius);

    var newValue = distanceBetweenPoints(origin, newCoord) / radius;
    point.attr('cx', newCoord.x);
    point.attr('cy', newCoord.y);
    point.attr('data-value', newValue);
    redrawPolygonToMatchTips(group.select(function () {
      return _this.parentNode.parentNode;
    }));
    graphUpdated(readRatingValues());

    function vMake(x, y) {
      return { x: x, y: y };
    }
    function vSub(a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
    }
    function vAdd(a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
    }
    function vMulS(a, s) {
      return { x: a.x * s, y: a.y * s };
    }
    function vLength(a) {
      return Math.sqrt(a.x * a.x + a.y * a.y);
    }
    // Project a onto b
    function vProjection(a, b) {
      return vMulS(b, vDot(a, b) / vDot(b, b));
    }
    function vDot(a, b) {
      return a.x * b.x + a.y * b.y;
    }

    function newPointOnAxis(origin, vAxis, offsetC) {
      var vOffset = vSub(offsetC, origin);
      return vAdd(origin, vProjection(vOffset, vAxis));
    }

    function constrainLength(origin, point, direction, maxLength) {
      var normalized = vSub(point, origin);
      var length = vLength(normalized);
      if (vDot(normalized, direction) <= 0) {
        return origin;
      }
      if (length > maxLength) {
        var lengthFactor = maxLength / length;
        return vAdd(origin, vMake(normalized.x * lengthFactor, normalized.y * lengthFactor));
      }
      return point;
    }

    function distanceBetweenPoints(oldc, newc) {
      var diffv = vSub(newc, oldc);
      return vLength(diffv);
    }
  }

  var drag = d3.behavior.drag().origin(function (d) {
    var elem = d3.event.target;return { x: elem.getAttribute('cx'), y: elem.getAttribute('cy') };
  }).on('drag', dragmove);

  function redrawPolygonToMatchTips(g) {
    var circles = container.selectAll('svg .radar-data circle');
    var vertices = circles.map(function (c) {
      return c.map(function (tip) {
        return { x: tip.getAttribute('cx'), y: tip.getAttribute('cy') };
      });
    });
    drawGraphPolygon(g, vertices, false);
  }

  function readRatingValues() {
    var circles = container.selectAll('svg .radar-data circle');
    return circles[0].map(function (svge) {
      return { value: svge.getAttribute('data-value'), title: getAxisTitle(svge.getAttribute('data-axis')) };
    });
  }

  function drawGraph(g, vertices, enableManipulation) {
    drawGraphPolygon(g, vertices, true);
    drawGraphTips(g, vertices, enableManipulation);
  }

  function drawGraphPolygon(g, vertices, animate) {
    var area = g.selectAll('polygon').data(vertices);

    area.exit().transition().duration(500).attr('points', function (d) {
      return d.reduce(function (prev, curr) {
        return prev + ' ' + origin.x + ',' + origin.y;
      }, '');
    }).remove();

    area.enter().append('polygon').attr('class', function (d, i) {
      return 'radar-chart-serie' + i;
    }).style('stroke-width', '2px').style('stroke', function (d, i) {
      return cfg.color(i);
    }).style('fill', function (d, i) {
      return cfg.color(i);
    }).style('fill-opacity', cfg.opacityArea).attr('points', function (d) {
      return d.reduce(function (prev, curr) {
        return prev + ' ' + origin.x + ',' + origin.y;
      }, '');
    }).on('mouseover', function (d) {
      var selected = 'polygon.' + d3.select(this).attr('class');

      g.selectAll('polygon').transition(200).style('fill-opacity', 0.1);

      g.selectAll(selected).transition(200).style('fill-opacity', .7);
    }).on('mouseout', function () {
      g.selectAll('polygon').transition(200).style('fill-opacity', cfg.opacityArea);
    });

    var initialSelection = animate ? area.transition().duration(500) : area;
    initialSelection.attr('points', function (d) {
      return d.reduce(function (prev, curr) {
        return prev + ' ' + curr.x + ',' + curr.y;
      }, '');
    });
  }

  function drawGraphTips(g, vertices, enableManipulation) {
    var gtips = g.selectAll('g.area-tips').data(vertices);

    gtips.enter().append('g').attr('class', function (d, i) {
      return 'area-tips radar-chart-serie' + i;
    }).style('fill', function (d, i) {
      return cfg.color(i);
    }).style('fill-opacity', .9);

    gtips.exit().remove();

    var tips = gtips.selectAll('circle').data(function (d) {
      return d;
    });

    tips.exit().remove();

    var enter = tips.enter().append('circle').attr('r', cfg.tipRadius).attr('data-axis', function (vertex, i) {
      return i;
    }).attr('data-value', function (vertex, i) {
      return vertex.value;
    }).on('mouseover', function (d) {
      var tip = d3.select(this);
      tooltip.attr('x', parseFloat(tip.attr('cx')) - 10).attr('y', parseFloat(tip.attr('cy')) - 10).text(Format(tip.attr('data-value'))).transition(200).style('opacity', 1);

      var selected = 'polygon.' + tip.attr('class');

      g.selectAll('polygon').transition(200).style('fill-opacity', 0.1);

      g.selectAll(selected).transition(200).style('fill-opacity', .7);
    }).on('mouseout', function () {
      tooltip.transition(200).style('opacity', 0);

      g.selectAll('polygon').transition(200).style('fill-opacity', cfg.opacityArea);
    });

    if (enableManipulation) {
      enter.call(drag);
    }
    tips.transition().duration(500).attr('cx', function (vertex, i) {
      return vertex.x;
    }).attr('cy', function (vertex, i) {
      return vertex.y;
    });
  }

  return {
    reset: function reset(containerId, data, options) {
      cfg = buildConfig(options);
      container = d3.select(containerId);

      var axisTitles = data[0].map(function (i) {
        return i.axis;
      });
      axisCount = axisTitles.length;
      setRadius(Math.min(cfg.w / 2, cfg.h / 2));
      initAxes(axisTitles);

      container.select('svg').remove();

      // Add padding and translate to make space for legends
      var svg = container.append("svg").attr("width", cfg.w + cfg.marginX).attr("height", cfg.h + cfg.marginY);

      var g = svg.append('g').attr('class', 'radar-axes');
      translateByMargin(g);

      drawLevelLines(g, cfg.levels, radius, axisTitles);
      drawLevelTitles(g, cfg.levels, radius, cfg.maxValue);
      drawAxes(g, radius, axisTitles);

      return this;
    },
    draw: function draw(ratings, enableManipulation) {

      var svg = container.select('svg');

      // TODO look for adding elegance here, just a quick hack for now
      var g = svg.select('.radar-data');
      if (!g[0][0]) {
        g = svg.append('g').attr('class', 'radar-data');
        translateByMargin(g);
        drawTooltip(g);
      }

      var axisAngle = pi2 / axisCount;

      var vertices = ratings.map(function (rating, idx) {
        return rating.map(function (subRating, i) {
          return { x: radius * (1 - subRating.value * Math.sin(i * axisAngle)),
            y: radius * (1 - subRating.value * Math.cos(i * axisAngle)),
            value: subRating.value };
        });
      });
      drawGraph(g, vertices, enableManipulation);

      return graphUpdatesE;
    }
  };
};