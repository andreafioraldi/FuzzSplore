var rect = d3.select("#tree").node().getBoundingClientRect(); 

var margin = {top: 50, right: 90, bottom: 30, left: 90},
    width = rect.width - margin.left - margin.right,
    height = rect.height - margin.top - margin.bottom;

const colorScale = d3.scaleOrdinal()
        .range(d3.schemeCategory10);

d3.json('http://0.0.0.0:8888/data/graphs.json', data => {
  
  var divs = {}
  
  for (var fuzzer in data) {
    
    var new_div = document.createElement("div");
    new_div.style.visibility = 'hidden'
    new_div.setAttribute("class", "graph_div");
    new_div.setAttribute("id", "graph_div_" + fuzzer);
    document.getElementById('tree').appendChild(new_div)
    
    divs[fuzzer] = new_div
    
    networkChart = renderChartCollapsibleNetwork(fuzzer)
      .svgHeight(height)
      .svgWidth(width)
      .container("#graph_div_" + fuzzer)
      .data({ root: data[fuzzer] })
      .run()
  
  }
  
  var svg_curtree = d3.select("#graph_select")
    .append("svg")
      .attr("width", rect.width)
      .attr("height", d3.select("#graph_select").node().getBoundingClientRect().height)
    .append("g")

  var leg_idx = {}

  var current_tree = null;
  function select_a_tree(fuzzer) {

    var obj = d3.selectAll('.tree_sel').filter(function(d) {return d == fuzzer})
    d3.selectAll('.tree_sel').attr("font-weight", (k) => 'normal')
    obj.attr("font-weight", (k) => 'bold')

    for (var f in divs) {
      divs[f].style.visibility = 'hidden'
    }
    if (current_tree !== null) {
      divs[current_tree].style.visibility = 'hidden'
    }
    divs[fuzzer].style.visibility = 'visible'
    divs[fuzzer].style.top = '0'
    current_tree = fuzzer;
  
  }

  svg_curtree
    .selectAll("curTreeSelector")
    .data([' Current tree:'].concat(Object.keys(data)))
    .enter()
      .append('g')
      .append("text")
        .attr('x', function(d,i){
          var l = 0
          for (var j = 0; j < i; ++j)
            l += leg_idx[j]*15 + 15
          leg_idx[i] = d.length
          return 80 + l
        })
        .attr('y', 30)
        .text(function(d) { return d; })
        .style("fill", function(d){ if (d == ' Current tree:') return 'black'; return colorScale(d); })
        .style("font-size", 15)
        .attr('class', 'tree_sel')
        //.attr("font-weight", function(d,i) { if (d !== ' Current tree:') return 'bold'; else 'normal';})
      .on("click", function(fuzz){
        if (fuzz == ' Current tree:') return
        select_a_tree(fuzz)
      })
    
    select_a_tree(Object.keys(data)[0])
  
  var svg_curcross = d3.select("#graph_cross")
    .append("svg")
      .attr("width", rect.width)
      .attr("height", d3.select("#graph_cross").node().getBoundingClientRect().height)
    .append("g")

  leg_idx = {}

  svg_curcross
    .selectAll("curTreeCross")
    .data(['Cross compare:'].concat(Object.keys(data)))
    .enter()
      .append('g')
      .append("text")
        .attr('x', function(d,i){
          var l = 0
          for (var j = 0; j < i; ++j)
            l += leg_idx[j]*15 + 15
          leg_idx[i] = d.length
          return 80 + l
        })
        .attr('y', 30)
        .text(function(d) { return d; })
        .style("fill", function(d){ if (d == 'Cross compare:') return 'black'; return colorScale(d); })
        .style("font-size", 15)
        .attr('class', 'tree_cross')
        //.attr("font-weight", function(d,i) { if (d !== 'Current tree:') return 'bold'; else 'normal';})
      .on("click", function(fuzz){
        if (fuzz == 'Cross compare:') return
        
        d3.selectAll('.tree_cross').attr("font-weight", (k) => 'normal')
        
        if (current_tree != fuzz) {
          d3.select(this).attr("font-weight", (k) => 'bold')
          // ... 
        }
        
      })
    
  })
/*  

This code is based on following convention:

https://github.com/bumbeishvili/d3-coding-conventions

*/

function renderChartCollapsibleNetwork(fuzzer) {

  // exposed variables
  var attrs = {
    id: 'id' + Math.floor(Math.random() * 1000000),
    svgWidth: 960,
    svgHeight: 600,
    marginTop: 0,
    marginBottom: 5,
    marginRight: 0,
    marginLeft: 30,
    nodeRadius: 18,
    container: 'body',
    distance: 100,
    nodeStroke: '#41302D',
    nodeTextColor: 'black',
    linkColor: '#303030',
    activeLinkColor: "blue",
    hoverOpacity: 0.2,
    maxTextDisplayZoomLevel: 1,
    textDisplayed: true,
    lineStrokeWidth: 1.5,
    data: null
  };

  //innerFunctions which will update visuals
  var updateData;
  var filter;

  //main chart object
  var main = function (selection) {
    selection.each(function scope() {

      //calculated properties
      var calc = {}
      calc.chartLeftMargin = attrs.marginLeft;
      calc.chartTopMargin = attrs.marginTop;
      calc.chartWidth = attrs.svgWidth - attrs.marginRight - calc.chartLeftMargin;
      calc.chartHeight = attrs.svgHeight - attrs.marginBottom - calc.chartTopMargin;

      //########################## HIERARCHY STUFF  #########################
      var hierarchy = {};
      hierarchy.root = d3.hierarchy(attrs.data.root);


      //###########################   BEHAVIORS #########################
      var behaviors = {};
      behaviors.zoom = d3.zoom().on('zoom', zoomed);
      behaviors.drag = d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);

      //###########################   LAYOUTS #########################
      var layouts = {};

      // custom radial kayout
      layouts.radial = d3.radial();

      //###########################   FORCE STUFF #########################
      var force = {};
      force.link = d3.forceLink().id(d => d.id);
      force.charge = d3.forceManyBody()
      force.center = d3.forceCenter(calc.chartWidth / 2, calc.chartHeight / 2)

      // prevent collide
      force.collide = d3.forceCollide().radius(d => {

        // if parent has many children, reduce collide strength
        if (d.parent) {
          if (d.parent.children.length > 10) {

            // also slow down node movement
            slowDownNodes();
            return 7;
          }
        }

        // increase collide strength 
        if (d.children && d.depth > 2) {
          return attrs.nodeRadius;
        }
        return attrs.nodeRadius * 2;
      });

      //manually set x positions (which is calculated using custom radial layout)
      force.x = d3.forceX()
        .strength(0.5)
        .x(function (d, i) {

          // if node does not have children and is channel (depth=2) , then position it on parent's coordinate
          if (!d.children && d.depth > 2) {
            if (d.parent) {
              d = d.parent
            }
          }

          // custom circle projection -  radius will be -  (d.depth - 1) * 150
          return projectCircle(d.proportion, (d.depth - 1) * 150)[0];
        });


      //manually set y positions (which is calculated using d3.cluster)
      force.y = d3.forceY()
        .strength(0.5)
        .y(function (d, i) {

          // if node does not have children and is channel (depth=2) , then position it on parent's coordinate
          if (!d.children && d.depth > 2) {
            if (d.parent) {
              d = d.parent
            }
          }

          // custom circle projection -  radius will be -  (d.depth - 1) * 150
          return projectCircle(d.proportion, (d.depth - 1) * 150)[1];
        })


      //---------------------------------  INITIALISE FORCE SIMULATION ----------------------------

      // get based on top parameter simulation
      force.simulation = d3.forceSimulation()
        .force('link', force.link)
        .force('charge', force.charge)
        .force('center', force.center)
        .force("collide", force.collide)
        .force('x', force.x)
        .force('y', force.y)

      // flatten root 
      var arr = flatten(hierarchy.root);

      //####################################  DRAWINGS #######################

      //drawing containers
      var container = d3.select(this);

      //add svg
      var svg = container.patternify({ tag: 'svg', selector: 'svg-chart-container' })
        .attr('width', attrs.svgWidth)
        .attr('height', attrs.svgHeight)
        .call(behaviors.zoom)

      //add container g element
      var chart = svg.patternify({ tag: 'g', selector: 'chart' })
        .attr('transform', 'translate(' + (calc.chartLeftMargin) + ',' + calc.chartTopMargin + ')');


      //################################   Chart Content Drawing ##################################

      //link wrapper
      var linksWrapper = chart.patternify({ tag: 'g', selector: 'links-wrapper' })

      //node wrapper
      var nodesWrapper = chart.patternify({ tag: 'g', selector: 'nodes-wrapper' })
      var nodes, links, enteredNodes;

      // reusable function which updates visual based on data change
      update();

      //update visual based on data change
      function update(clickedNode) {

        //  set xy and proportion properties with custom radial layout
        layouts.radial(hierarchy.root);

        //nodes and links array
        var nodesArr = flatten(hierarchy.root, true)
          .orderBy(d => d.depth)
          .filter(d => !d.hidden);

        var linksArr = hierarchy.root.links()
          .filter(d => !d.source.hidden)
          .filter(d => !d.target.hidden)

        // make new nodes to appear near the parents
        nodesArr.forEach(function (d, i) {
          if (clickedNode && clickedNode.id == (d.parent && d.parent.id)) {
            d.x = d.parent.x;
            d.y = d.parent.y;
          }
        });

        //links
        links = linksWrapper.selectAll('.link').data(linksArr, d => d.target.id);
        links.exit().remove();
        links = links.enter()
          .append('line')
          .attr('class', 'link')
          .merge(links).attr('stroke', '#9ecae1');
        links.attr('stroke', attrs.linkColor).attr('stroke-width', attrs.lineStrokeWidth)

        //node groups
        nodes = nodesWrapper.selectAll('.node').data(nodesArr, d => d.id);
        var exited = nodes.exit().remove();
        var enteredNodes = nodes.enter()
          .append('g')
          .attr('class', 'node')

        //bind event handlers
        enteredNodes.on('click', nodeClick)
          .on('mouseenter', nodeMouseEnter)
          .on('mouseleave', nodeMouseLeave)
          .call(behaviors.drag)

        //node texts
        enteredNodes.append('text').attr('class', 'node-texts')
          .attr('x', 15).attr('fill', attrs.nodeTextColor)
          .text(d => d.data.name)
          .style('display', attrs.textDisplayed ? "initial" : "none")

        //channels grandchildren
        var channelsGrandchildren = enteredNodes
          .append("circle")
          .attr('r', 7)
          .attr('stroke-width', 5)
          .attr('stroke', attrs.nodeStroke)
          //.style("fill", function (d) { return colorScale(d.data.fuzzer); })

        //merge  node groups and style it
        nodes = enteredNodes.merge(nodes);
        /*nodes
          .attr('fill', d => {
            return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
          })
          .style('cursor', 'pointer')*/

        //force simulation
        force.simulation.nodes(nodesArr)
          .on('tick', ticked);

        // links simulation
        force.simulation.force("link").links(links).id(d => d.id).distance(100).strength(d => 1);
      }

      //####################################### EVENT HANDLERS  ########################

      // zoom handler
      function zoomed() {

        //get transform event
        var transform = d3.event.transform;
        attrs.lastTransform = transform;

        // apply transform event props to the wrapper
        chart.attr('transform', transform)
       
        svg.selectAll('.node').attr("transform", function (d) { return `translate(${d.x},${d.y}) scale(${1 / (attrs.lastTransform ? attrs.lastTransform.k : 1)})`; });
        svg.selectAll('.link').attr("stroke-width", attrs.lineStrokeWidth / (attrs.lastTransform ? attrs.lastTransform.k : 1));

        // hide texts if zooming is less than certain level
        if (transform.k < attrs.maxTextDisplayZoomLevel) {
          svg.selectAll('.node-texts').style('display', 'none');
          attrs.textDisplayed = false;
        } else {
          svg.selectAll('.node-texts').style('display', 'initial');
          attrs.textDisplayed = true;
        }
      }


      //tick handler
      function ticked() {

        // set links position
        links.attr("x1", function (d) { return d.source.x; })
          .attr("y1", function (d) { return d.source.y; })
          .attr("x2", function (d) { return d.target.x; })
          .attr("y2", function (d) { return d.target.y; });

        //set nodes position
        svg.selectAll('.node').attr("transform", function (d) { return `translate(${d.x},${d.y}) scale(${1 / (attrs.lastTransform ? attrs.lastTransform.k : 1)})`; });
      }

      //handler drag start event
      function dragstarted(d) {

        //disable node fixing
        nodes.each(d => { d.fx = null; d.fy = null })
      }


      // handle dragging event
      function dragged(d) {

        // make dragged node fixed
        d.fx = d3.event.x;
        d.fy = d3.event.y;

       
      }

     

      //-------------------- handle drag end event ---------------
      function dragended(d) {
        // we are doing nothing, here , aren't we? 
      }

      //-------------------------- node mouse hover handler ---------------
      function nodeMouseEnter(d) {

        //get hovered node
        var node = d3.select(this);

        //get links
        var links = hierarchy.root.links();

        //get hovered node connected links
        var connectedLinks = links.filter(l => l.source.id == d.id || l.target.id == d.id);

        //get hovered node linked nodes
        var linkedNodes = connectedLinks.map(s => s.source.id).concat(connectedLinks.map(d => d.target.id))

        //reduce all other nodes opacity
        nodesWrapper.selectAll('.node')
          .filter(n => linkedNodes.indexOf(n.id) == -1)
          .attr('opacity', attrs.hoverOpacity);

        //reduce all other links opacity
        linksWrapper.selectAll('.link').attr('opacity', attrs.hoverOpacity);


        //highlight hovered nodes connections
        linksWrapper.selectAll('.link')
          .filter(l => l.source.id == d.id || l.target.id == d.id)
          .attr('opacity', 1)
          .attr('stroke', attrs.activeLinkColor)

        

      }

      // --------------- handle mouseleave event ---------------
      function nodeMouseLeave(d) {

        // return things back to normal
        nodesWrapper.selectAll('.node').attr('opacity', 1);
        linksWrapper.selectAll('.link').attr('opacity', 1).attr('stroke', attrs.linkColor)
      }

      // --------------- handle node click event ---------------
      function nodeClick(d) {
      
        console.log(d)
        
        nodesWrapper.selectAll('.node').attr('fill', 'red');
        console.log(nodesWrapper.selectAll('.node').attr('opacity'))

        //free fixed nodes
        nodes.each(d => { d.fx = null; d.fy = null })

        // collapse or expand node
        /*if (d.children) {
          d._children = d.children;
          d.children = null;
          update();
          force.simulation.restart();
          force.simulation.alphaTarget(0.15);
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
          update(d);
          force.simulation.restart();
          force.simulation.alphaTarget(0.15);
        } else {
          //nothing is to collapse or expand
        }*/
        freeNodes();
      }

      //#########################################  UTIL FUNCS ##################################
      updateData = function () {
        main.run();
      }

      function slowDownNodes() {
        force.simulation.alphaTarget(0.05);
      };

      function speedUpNodes() {
        force.simulation.alphaTarget(0.45);
      }

      function freeNodes() {
        d3.selectAll('.node').each(n => { n.fx = null; n.fy = null; })
      }

      function projectCircle(value, radius) {
        var r = radius || 0;
        var corner = value * 2 * Math.PI;
        return [Math.sin(corner) * r, -Math.cos(corner) * r]

      }

      //recursively loop on children and extract nodes as an array
      function flatten(root, clustered) {
        var nodesArray = [];
        var i = 0;
        function recurse(node, depth) {
          if (node.children)
            node.children.forEach(function (child) {
              recurse(child, depth + 1);
            });
          if (!node.id) node.id = ++i;
          else ++i;
          node.depth = depth;
          if (clustered) {
            if (!node.cluster) {
              // if cluster coordinates are not set, set it
              node.cluster = { x: node.x, y: node.y }
            }
          }
          nodesArray.push(node);
        }
        recurse(root, 1);
        return nodesArray;
      }

      function debug() {
        if (attrs.isDebug) {
          //stringify func
          var stringified = scope + "";

          // parse variable names
          var groupVariables = stringified
            //match var x-xx= {};
            .match(/var\s+([\w])+\s*=\s*{\s*}/gi)
            //match xxx
            .map(d => d.match(/\s+\w*/gi).filter(s => s.trim()))
            //get xxx
            .map(v => v[0].trim())

          //assign local variables to the scope
          groupVariables.forEach(v => {
            main['P_' + v] = eval(v)
          })
        }
      }
      debug();
    });
  };

  //----------- PROTOTYEPE FUNCTIONS  ----------------------
  d3.selection.prototype.patternify = function (params) {
    var container = this;
    var selector = params.selector;
    var elementTag = params.tag;
    var data = params.data || [selector];

    // pattern in action
    var selection = container.selectAll('.' + selector).data(data)
    selection.exit().remove();
    selection = selection.enter().append(elementTag).merge(selection)
    selection.attr('class', selector);
    return selection;
  }

  // custom radial layout
  d3.radial = function () {
    return function setProportions(root) {
      recurse(root, 0, 1);
      function recurse(node, min, max) {
        node.proportion = (max + min) / 2;
        if (!node.x) {

          // if node has parent, match entered node positions to it's parent
          if (node.parent) {
            node.x = node.parent.x;
          } else {
            node.x = 0;
          }
        }

        // if node had parent, match entered node positions to it's parent
        if (!node.y) {
          if (node.parent) {
            node.y = node.parent.y;
          } else {
            node.y = 0;
          }
        }

        //recursively do the same for children
        if (node.children) {
          var offset = (max - min) / node.children.length;
          node.children.forEach(function (child, i, arr) {
            var newMin = min + offset * i;
            var newMax = newMin + offset;
            recurse(child, newMin, newMax);
          });
        }
      }
    }
  }

  //https://github.com/bumbeishvili/d3js-boilerplates#orderby
  Array.prototype.orderBy = function (func) {
    this.sort((a, b) => {
      var a = func(a);
      var b = func(b);
      if (typeof a === 'string' || a instanceof String) {
        return a.localeCompare(b);
      }
      return a - b;
    });
    return this;
  }


  //##########################  BOILEPLATE STUFF ################

  //dinamic keys functions
  Object.keys(attrs).forEach(key => {
    // Attach variables to main function
    return main[key] = function (_) {
      var string = `attrs['${key}'] = _`;
      if (!arguments.length) { return eval(` attrs['${key}'];`); }
      eval(string);
      return main;
    };
  });

  //set attrs as property
  main.attrs = attrs;

  //debugging visuals
  main.debug = function (isDebug) {
    attrs.isDebug = isDebug;
    if (isDebug) {
      if (!window.charts) window.charts = [];
      window.charts.push(main);
    }
    return main;
  }

  //exposed update functions
  main.data = function (value) {
    if (!arguments.length) return attrs.data;
    attrs.data = value;
    if (typeof updateData === 'function') {
      updateData();
    }
    return main;
  }

  // run  visual
  main.run = function () {
    d3.selectAll(attrs.container).call(main);
    return main;
  }

  main.filter = function (filterParams) {
    if (!arguments.length) return attrs.filterParams;
    attrs.filterParams = filterParams;
    if (typeof filter === 'function') {
      filter();
    }
    return main;
  }

  return main;
}
