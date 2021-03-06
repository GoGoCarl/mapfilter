'use strict'

var d3 = window.d3
var id = 0

module.exports = function () {
  var margin = {top: 10, right: 10, bottom: 20, left: 10},
    x,
    y = d3.scale.linear().range([110, 0]),
    axis = d3.svg.axis().orient('bottom'),
    brush = d3.svg.brush(),
    brushDirty,
    dimension,
    group,
    collection,
    round

  id++

  function chart (div) {
    var addDays = d3.time.day.offset,
      height = y.range()[0]

    y.domain([0, group.top(1)[0].value])

    div.each(function () {
      var div = d3.select(this),
        g = div.select('g'),
        width = Math.max(200, parseInt(div.style('width'), 10) - margin.left - margin.right)

      x.range([0, width])

      // Create the skeletal chart.
      if (g.empty()) {
        // div.select(".title").append("a")
        //     .attr("href", "javascript:reset(" + id + ")")
        //     .attr("class", "reset")
        //     .text("reset")
        //     .style("display", "none")

        g = div.append('svg')
          .attr('width', '100%')
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

        g.append('clipPath')
          .attr('id', 'clip-' + id)
          .append('rect')
          .attr('width', width)
          .attr('height', height)

        g.selectAll('.bar')
          .data(['background', 'foreground'])
          .enter().append('path')
          .attr('class', function (d) { return d + ' bar' })
          .datum(group.all())

        g.selectAll('.foreground.bar')
          .attr('clip-path', 'url(#clip-' + id + ')')

        g.append('g')
          .attr('class', 'axis')
          .attr('transform', 'translate(0,' + height + ')')
          .call(axis)

        // Initialize the brush component with pretty resize handles.
        var gBrush = g.append('g').attr('class', 'brush').call(brush)
        gBrush.selectAll('rect').attr('height', height)
        gBrush.selectAll('.resize').append('path').attr('d', resizePath)
      }

      // Only redraw the brush if set externally.
      if (brushDirty) {
        brushDirty = false
        g.selectAll('.brush').call(brush)
        // div.select(".title a").style("display", brush.empty() ? "none" : null)
        if (brush.empty()) {
          g.selectAll('#clip-' + id + ' rect')
            .attr('x', 0)
            .attr('width', width)
        } else {
          var extent = brush.extent()
          g.selectAll('#clip-' + id + ' rect')
            .attr('x', x(extent[0]))
            .attr('width', x(extent[1]) - x(extent[0]))
        }
      }

      g.selectAll('.bar').attr('d', barPath)
    })

    function barPath (groups) {
      var path = [],
        i = -1,
        n = groups.length,
        d
      while (++i < n) {
        d = groups[i]
        path.push('M', x(d.key), ',', height, 'V', y(d.value), 'h' + (x(d3.time.day.offset(x.domain()[0], 1)) - 1) + 'V', height)
      }
      return path.join('')
    }

    function resizePath (d) {
      var e = +(d === 'e'),
        x = e ? 1 : -1,
        y = height / 3
      return 'M' + (0.5 * x) + ',' + y +
        'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6) +
        'V' + (2 * y - 6) +
        'A6,6 0 0 ' + e + ' ' + (0.5 * x) + ',' + (2 * y) +
        'Z' +
        'M' + (2.5 * x) + ',' + (y + 8) +
        'V' + (2 * y - 8) +
        'M' + (4.5 * x) + ',' + (y + 8) +
        'V' + (2 * y - 8)
    }
  }

  // brush.on("brushstart.chart", function() {
  //   var div = d3.select(this.parentNode.parentNode.parentNode)
  //   div.select(".title a").style("display", null)
  // })

  brush.on('brush.chart', function () {
    var g = d3.select(this.parentNode),
      extent = brush.extent()
    if (round) {
      g.select('.brush')
        .call(brush.extent(extent = extent.map(round)))
        .selectAll('.resize')
        .style('display', null)
    }
    g.select('#clip-' + id + ' rect')
      .attr('x', x(extent[0]))
      .attr('width', x(extent[1]) - x(extent[0]))
    dimension.filterRange(extent)
  })

  brush.on('brushend.chart', function () {
    if (brush.empty()) {
      chart.reset()
    }
  })

  chart.collection = function (_) {
    collection = _
    return chart
  }

  chart.margin = function (_) {
    if (!arguments.length) return margin
    margin = _
    return chart
  }

  chart.x = function (_) {
    if (!arguments.length) return x
    x = _
    axis.scale(x)
    brush.x(x)
    return chart
  }

  chart.y = function (_) {
    if (!arguments.length) return y
    y = _
    return chart
  }

  chart.dimension = function (_) {
    if (!arguments.length) return dimension
    dimension = _
    return chart
  }

  chart.filter = function (_) {
    if (_) {
      brush.extent(_)
      dimension.filterRange(_)
    } else {
      chart.reset()
    }
    brushDirty = true
    return chart
  }

  chart.reset = function () {
    d3.select('#clip-' + id + ' rect').attr('x', null).attr('width', '100%')
    brush.clear()
    brushDirty = true
    dimension.filterAll()
    collection.trigger('filtered')
  }

  chart.group = function (_) {
    if (!arguments.length) return group
    group = _
    return chart
  }

  chart.round = function (_) {
    if (!arguments.length) return round
    round = _
    return chart
  }

  return d3.rebind(chart, brush, 'on')
}
