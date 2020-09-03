
var coverage_addline = function(fuzzer, time) {}
var filter_coverage = function (tmin, tmax) {}

d3.csv("http://0.0.0.0:8888/data/coverage.csv", function(data) {

  // set the dimensions and margins of the graph
  /*var margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#coverage")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");*/
  
  var rect = d3.select("#coverage").node().getBoundingClientRect(); 
  
  var margin = {top: 10, right: 20, bottom: 30, left: 40},
      width = rect.width - margin.left - margin.right,
      height = rect.height - margin.top - margin.bottom;
  
  var svg = d3.select("#coverage")
    .append("svg")
      .attr("width", rect.width)
      .attr("height", rect.height)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");


  var ptsize = 1.5

  var xmin = d3.min(data, (d) => { return +d.TIME; }) -ptsize
  var xmax = d3.max(data, (d) => { return +d.TIME; }) +ptsize
  
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
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([ymin, ymax])
    .range([ height, 0 ]);
    
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")));
  
  var lines = {}
  
  svg.selectAll(".line")
      .data(sumstat)
      .enter()
      .append("path")
        .attr("fill", "none")
        .attr("class", "covline")
        .attr("stroke", function(d){ return colorScale(d.key) })
        .attr("stroke-width", 1.5)
        .attr("d", function(d){
          return d3.line()
            .x(function(d) { return x(+d.TIME); })
            .y(function(d) { return y(+d.VAL); })
            (d.values)
        })

  filter_coverage = function (tmin, tmax) {
  
    var sumstat2 = []
    var ymins = []
    var ymaxs = []
    for (k in sumstat) {
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
    
    if (new_ymin != ymin || new_ymax != ymax) {
      y.domain([new_ymin, new_ymax])
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
    
    d3.selectAll(".covline").remove()
    
    svg.selectAll(".line")
        .data(sumstat)
        .enter()
        .append("path")
          .attr("fill", "none")
          .attr("class", "covline")
          .attr("stroke", function(d){ return colorScale(d.key) })
          .attr("stroke-width", 1.5)
          .attr("d", function(d){
            return d3.line()
              .x(function(d) { return x(+d.TIME); })
              .y(function(d) { return y(+d.VAL); })
              (d.values)
          })
    
  }

  coverage_addline = function (fuzzer, time) {
    
    svg.append("svg:line")
      .attr("class", "sel_line")
      .attr("x1", x(+time))
      .attr("y1", height)
      .attr("x2", x(+time))
      .attr("y2", 0)
      .attr("stroke-width", 1)
      .attr("fuzzer", function(d){ return fuzzer })
      .attr("stroke", colorScale(fuzzer));
    
  }

})
