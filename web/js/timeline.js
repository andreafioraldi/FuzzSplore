//Read the data

var id_to_time = function (fuzzer, id) {}

d3.csv("http://0.0.0.0:8888/data/timeline.csv", function(data) {

  var timeline = data
  timeline = timeline.map(function (elem) {
    elem.IDS = elem.IDS.split(':')
    return elem
  })
  
  var idmap = {}
  timeline.forEach(function (elem) {
    elem.IDS.forEach(function (id) {
      idmap[[elem.NAME, id]] = +elem.TIME
    })
  })
  
  id_to_time = function (fuzzer, id) {
    return idmap[[fuzzer, id]]
  }

  var rect = d3.select("#timeline").node().getBoundingClientRect(); 

  var margin = {top: -200, right:80, bottom: 80, left:80},
      width = rect.width - margin.left - margin.right,
      height = rect.height - margin.top - margin.bottom;

  // TimeLine
  //var formatDateIntoYear = d3.timeFormat("%Y");
  //var formatDate = d3.timeFormat("%b %Y");
  //var parseDate = d3.timeParse("%m/%d/%y");
  var lastElem = data.slice(0).sort( (a, b) => (parseInt(a.TIME) < parseInt(b.TIME))? 1 : ((parseInt(a.TIME) > parseInt(b.TIME))? -1 : 0))[0];

  var startDate = 0,
      endDate = parseInt(lastElem.TIME);

  var moving = false;
  var currentValue = 0;
  var targetValue = width;

  var x = d3.scaleLinear()
      .domain([startDate, endDate])
      .range([0, targetValue])
      .clamp(true);

  var timeline = d3.select("#timeline")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

  var slider = timeline.append("g")
      .attr("class", "slider")
      .attr("transform", "translate(" + margin.left + "," + height/5 + ")");

  slider.append("line")
      .attr("class", "track")
      .attr("x1", x.range()[0])
      .attr("x2", x.range()[1])
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "track-inset")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "track-overlay")
      .call(d3.drag()
          .on("start.interrupt", function() { slider.interrupt(); })
          .on("start drag", function() {
            currentValue = d3.event.x;
            update(x.invert(currentValue)); 
          })
      );

  slider.insert("g", ".track-overlay")
      .attr("class", "ticks")
      .attr("transform", "translate(0," + 18 + ")")
    .selectAll("text")
      .data(x.ticks(10))
      .enter()
      .append("text")
      .attr("x", x)
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .text(function(d) { /*return formatDateIntoYear(d)*/ `${d}`; });

  var handle = slider.insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("r", 9);

  var label = slider.append("text")  
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .text(/*formatDate(startDate)*/`${startDate}`)
      .attr("transform", "translate(0," + (-25) + ")")

  function update(h) {
    // update position and text of label according to slider scale
    handle.attr("cx", x(h));
    label
      .attr("x", x(h))
      .text(/*formatDate(h)*/ `${Math.round(h)}`);

    // filter data set and redraw plot
    //var newData = dataset.filter(function(d) {
    //  return d.date < h;
    //})
    //drawPlot(newData);

  }

})
