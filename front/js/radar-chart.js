// Based on
// http://nbremer.blogspot.nl/2013/09/making-d3-radar-chart-look-bit-better.html
// which in turn is based on
// https://github.com/alangrafu/radar-chart-d3

var RadarChart = function () {

  const pi2 = 2 * Math.PI

  function buildConfig(customCfg) {
    var cfg = {
      tipRadius: 6,
      w: 600,
      h: 600,
      factorLegend: .85,
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

  return {
    draw: function(id, d, options) {
      var cfg = buildConfig(options)

      var allAxis = d[0].map(i => i.axis)
      var total = allAxis.length
      var radius = Math.min(cfg.w/2, cfg.h/2)
      var Format = d3.format('%')
      d3.select(id).select("svg").remove()

      // Add padding and translate to make space for legends
      var g = d3.select(id)
	    .append("svg")
	    .attr("width", cfg.w + cfg.marginX)
	    .attr("height", cfg.h + cfg.marginY)
	    .append("g")
	    .attr("transform", "translate("+ cfg.marginX/2 +","+ cfg.marginY/2 +")")

      // tangential level segments
      for(var j=0; j<cfg.levels; j++) {
        var levelFactor = radius*((j+1)/cfg.levels);
        g.selectAll(".levels")
	  .data(allAxis)
	  .enter()
	  .append("svg:line")
	  .attr("x1", function(d, i){return levelFactor*(1-Math.sin(i*pi2/total));})
	  .attr("y1", function(d, i){return levelFactor*(1-Math.cos(i*pi2/total));})
	  .attr("x2", function(d, i){return levelFactor*(1-Math.sin((i+1)*pi2/total));})
	  .attr("y2", function(d, i){return levelFactor*(1-Math.cos((i+1)*pi2/total));})
	  .attr("class", "level-line")
	  .attr("transform", "translate(" + (cfg.w/2-levelFactor) + ", " + (cfg.h/2-levelFactor) + ")");
      }

      // level segment labels
      for(var j=0; j<cfg.levels; j++) {
        var levelFactor = radius*((j+1)/cfg.levels);
        g.append("svg:text")
	  .attr("x", function(d){return levelFactor*(1-Math.sin(0));})
	  .attr("y", 0)
	  .attr("class", "level-title")
	  .attr("transform", "translate(" + (cfg.w/2-levelFactor + 5) + ", " + (cfg.h/2-levelFactor) + ")")
	  .text(Format((j+1)*cfg.maxValue/cfg.levels));
      }

      var axis = g.selectAll(".axis")
	    .data(allAxis)
	    .enter()
	    .append("g")
	    .attr("class", "axis")

      axis.append("line")
        .attr("x1", cfg.w/2)
        .attr("y1", cfg.h/2)
        .attr("x2", function(d, i){return cfg.w/2*(1-Math.sin(i*pi2/total));})
        .attr("y2", function(d, i){return cfg.h/2*(1-Math.cos(i*pi2/total));})
        .attr("class", "axis-line")

      axis.append("text")
        .attr("class", "axis-title")
        .text(function(d){return d})
        .attr("text-anchor", "middle")
        .attr("dy", "1.5em")
        .attr("transform", function(d, i){return "translate(0, -10)"})
        .attr("x", function(d, i){return cfg.w/2*(1-cfg.factorLegend*Math.sin(i*pi2/total))-60*Math.sin(i*pi2/total);})
        .attr("y", function(d, i){return cfg.h/2*(1-Math.cos(i*pi2/total))-20*Math.cos(i*pi2/total);});

      var series = 0;

      d.forEach(function(y, x){
        dataValues = [];
        g.selectAll(".nodes")
	  .data(y, function(j, i){
	    dataValues.push([
	      cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*Math.sin(i*pi2/total)),
	      cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*Math.cos(i*pi2/total))
	    ]);
	  });
        dataValues.push(dataValues[0]);
        g.selectAll(".area")
	  .data([dataValues])
	  .enter()
	  .append("polygon")
	  .attr("class", "radar-chart-serie"+series)
	  .style("stroke-width", "2px")
	  .style("stroke", cfg.color(series))
	  .attr("points",function(d) {
	    var str="";
	    for(var pti=0;pti<d.length;pti++){
	      str=str+d[pti][0]+","+d[pti][1]+" ";
	    }
	    return str;
	  })
	  .style("fill", function(j, i){return cfg.color(series)})
	  .style("fill-opacity", cfg.opacityArea)
	  .on('mouseover', function (d) {
	    var z = "polygon." + d3.select(this).attr("class");
	    g.selectAll("polygon")
	      .transition(200)
	      .style("fill-opacity", 0.1);
	    g.selectAll(z)
	      .transition(200)
	      .style("fill-opacity", .7);
	  })
	  .on('mouseout', function(){
	    g.selectAll("polygon")
	      .transition(200)
	      .style("fill-opacity", cfg.opacityArea);
	  });
        series++;
      });
      series=0;

      d.forEach(function(y, x){
        g.selectAll(".nodes")
	  .data(y).enter()
	  .append("svg:circle")
	  .attr("class", "radar-chart-serie"+series)
	  .attr('r', cfg.tipRadius)
	  .attr("alt", function(j){return Math.max(j.value, 0)})
	  .attr("cx", function(j, i){
	    dataValues.push([
	      cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*Math.sin(i*pi2/total)),
	      cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*Math.cos(i*pi2/total))
	    ]);
	    return cfg.w/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*Math.sin(i*pi2/total));
	  })
	  .attr("cy", function(j, i){
	    return cfg.h/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*Math.cos(i*pi2/total));
	  })
	  .attr("data-id", function(j){return j.axis})
	  .style("fill", cfg.color(series)).style("fill-opacity", .9)
	  .on('mouseover', function (d){
	    var newX = parseFloat(d3.select(this).attr('cx')) - 10;
	    var newY = parseFloat(d3.select(this).attr('cy')) - 5;
	    tooltip
	      .attr('x', newX)
	      .attr('y', newY)
	      .text(Format(d.value))
	      .transition(200)
	      .style('opacity', 1)

	    var z = "polygon." + d3.select(this).attr("class");
	    g.selectAll("polygon")
	      .transition(200)
	      .style("fill-opacity", 0.1);
	    g.selectAll(z)
	      .transition(200)
	      .style("fill-opacity", .7);
	  })
	  .on('mouseout', function(){
	    tooltip
	      .transition(200)
	      .style('opacity', 0);
	    g.selectAll("polygon")
	      .transition(200)
	      .style("fill-opacity", cfg.opacityArea);
	  })
	  .append("svg:title")
	  .text(function(j){return Math.max(j.value, 0)});

        series++;
      })
      
      var tooltip = g.append('text')
            .attr("class", 'tooltip')
            .style('opacity', 0)
            .style('font-family', 'sans-serif')
            .style('font-size', '13px')
    }
  }
}

