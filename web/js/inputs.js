
var inputs_addline = function(fuzzer, id, time) {}
var filter_inputs = function (tmin, tmax) {}

d3.csv("http://0.0.0.0:8888/data/inputs.csv", function(data) {

  // set the dimensions and margins of the graph
  /*var margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#inputs")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
  */

  var rect = d3.select("#inputs").node().getBoundingClientRect(); 
  
  var margin = {top: 10, right: 20, bottom: 30, left: 40},
      width = rect.width - margin.left - margin.right,
      height = rect.height - margin.top - margin.bottom;
  
  var svg = d3.select("#inputs")
    .append("svg")
      .attr("width", rect.width)
      .attr("height", rect.height)
      .call(d3.zoom().on("zoom", zoom))
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
  
  var ptsize = 1.5
  
  var xmin = d3.min(data, (d) => { return +d.TIME; }) -ptsize
  var xmax = d3.max(data, (d) => { return +d.TIME; }) +ptsize
  
  //data2 = data.filter((d) => { return +d.TIME > 100 })
  
  var ymin = d3.min(data, (d) => { return +d.VAL; }) -ptsize
  var ymax = d3.max(data, (d) => { return +d.VAL; }) +ptsize
  
  // group the data: I want to draw one line per group
  var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function(d) { return d.NAME;})
    .entries(data);
  
  const colorScale = d3.scaleOrdinal()
        .range(d3.schemeCategory10);

  // Add X axis
  var x = d3.scaleLinear()
    .domain([xmin, xmax])
    .range([ 0, width ]);
  var xxAxis = d3.axisBottom(x);
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xxAxis);

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([ymin, ymax])
    .range([ height, 0 ]);
  var yyAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format("d"));
  var yAxis = svg.append("g")
    .call(yyAxis);

  function zoom() {

    // re-scale y axis during zoom; ref [2]
    var newy = d3.event.transform.rescaleY(y);
    newy.domain([ymin, newy.domain()[1]]);
    yAxis.transition()
          .duration(50)
          .call(yyAxis.scale(newy));
    // re-draw circles using new y-axis scale; ref [3]
    graph
        .attr("d", function(d){
          return d3.line()
            .x(function(d) { return x(+d.TIME); })
            .y(function(d) { return newy(+d.VAL); })
            (d.values)
        })
  }
  
  var graph = svg.selectAll(".line")
      .data(sumstat)
      .enter()
      .append("path")
        .attr("fill", "none")
        .attr("class", "inputline")
        .attr("stroke", function(d){ return colorScale(d.key) })
        .attr("stroke-width", 1.5)
        .attr("d", function(d){
          return d3.line()
            .x(function(d) { return x(+d.TIME); })
            .y(function(d) { return y(+d.VAL); })
            (d.values)
        })

  filter_inputs = function (tmin, tmax) {
  
    var sumstat2 = []
    var ymins = []
    var ymaxs = []
  
    for (var k = 0; k < sumstat.length; ++k) {
      sumstat2.push( {
        key: sumstat[k].key,
        values: sumstat[k].values.filter((d) => { return +d.TIME <= tmax && +d.TIME >= tmin })
      } )
      ymins.push(d3.min(sumstat2[k].values, (d) => { return +d.VAL; }))
      ymaxs.push(d3.max(sumstat2[k].values, (d) => { return +d.VAL; }))
    }
    
    var new_ymin = d3.min(ymins) -ptsize
    var new_ymax = d3.max(ymaxs) +ptsize
    
    console.log(tmin)
    
    if (/*new_ymin != ymin ||*/ new_ymax != ymax) {
      y.domain([0, new_ymax])
      yAxis.transition().duration(1000).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")))
      ymin = new_ymin
      ymax = new_ymax
    }
    
    if (tmax != xmax || tmin != xmin) {
      x.domain([tmin, tmax])
      xAxis.transition().duration(1000).call(d3.axisBottom(x))
      xmin = tmin
      xmax = tmax
    }
    
    d3.selectAll(".inputline").remove()
    
    svg.selectAll(".line")
        .data(sumstat2)
        .enter()
        .append("path")
          .attr("fill", "none")
          .attr("class", "inputline")
          .attr("stroke", function(d){ return colorScale(d.key) })
          .attr("stroke-width", 1.5)
          .attr("d", function(d){
            return d3.line()
              .x(function(d) { return x(+d.TIME); })
              .y(function(d) { return y(+d.VAL); })
              (d.values)
          })
    
  }

  /*
  svg.append("svg:line")
    .attr("class", "sel_line")
    .attr("x1", x(theDate))
    .attr("y1", height)
    .attr("x2", x(theDate))
    .attr("y2", 0)
    
    d3.select(".sel_line").remove();
  */

  inputs_addline = function (fuzzer, id, time) {
    
    svg.append("svg:line")
      .attr("class", "sel_line")
      .attr("x1", x(+time))
      .attr("y1", height)
      .attr("x2", x(+time))
      .attr("y2", 0)
      .attr("stroke-width", 1)
      .attr("fuzzer", function(d){ return fuzzer })
      .attr("name", function(d){ return id })
      .attr("stroke", colorScale(fuzzer));
    
  }

})
