//Read the data
d3.csv("http://0.0.0.0:8888/data/vectors.csv", function(data) {

  // set the dimensions and margins of the graph
  /*var margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#scatterplot")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");*/

  var rect = d3.select("#scatterplot").node().getBoundingClientRect(); 
  
  var margin = {top: 10, right: 20, bottom: 30, left: 40},
      width = rect.width - margin.left - margin.right,
      height = rect.height - margin.top - margin.bottom;
  
  var svg = d3.select("#scatterplot")
    .append("svg")
      .attr("width", rect.width)
      .attr("height", rect.height)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  var ptsize = 2

  var xmin = d3.min(data, (d) => { return +d.X; }) -ptsize
  var xmax = d3.max(data, (d) => { return +d.X; }) +ptsize
  
  var ymin = d3.min(data, (d) => { return +d.Y; }) -ptsize
  var ymax = d3.max(data, (d) => { return +d.Y; }) +ptsize
  
  const colorScale = d3.scaleOrdinal()
        .range(d3.schemeCategory10);
  
  // Add X axis
  var x = d3.scaleLinear()
    .domain([ xmin, xmax ])
    .range([ 0, width ]);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([ ymin, ymax ])
    .range([ height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add dots
  var circles = svg.append('g')
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", function (d) { return x(d.X); } )
      .attr("cy", function (d) { return y(d.Y); } )
      .attr("testcase", function (d) { return d.ID; } )
      .attr("r", ptsize)
      .attr("class", "non_brushed")
      .style("fill", function (d) { return colorScale(d.NAME); })

  function highlightBrushedCircles() {

    if (d3.event.selection != null) {

      // revert circles to initial style
      circles.attr("class", "non_brushed");

      var brush_coords = d3.brushSelection(this);

      d3.selectAll(".sel_line").remove();
      
      circles.filter(function (){

           var cx = d3.select(this).attr("cx"),
               cy = d3.select(this).attr("cy");

           return isBrushed(brush_coords, cx, cy);

       }).data().forEach(function (elem) {
        
        var t = id_to_time(elem.NAME, elem.ID)
        if (t !== undefined) {
          inputs_addline(elem.NAME, t);
          coverage_addline(elem.NAME, t);
        }
        
       })

      // style brushed circles
      circles.filter(function (){

           var cx = d3.select(this).attr("cx"),
               cy = d3.select(this).attr("cy");

           return isBrushed(brush_coords, cx, cy);
       })
       .attr("class", "brushed");

    }
  }
  
  function isBrushed(brush_coords, cx, cy) {

       var x0 = brush_coords[0][0],
           x1 = brush_coords[1][0],
           y0 = brush_coords[0][1],
           y1 = brush_coords[1][1];

      return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  }
  
  var brush = d3.brush()
    .on("brush", highlightBrushedCircles); 
  svg.append("g")
     .call(brush);

})
