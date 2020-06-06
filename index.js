/* eslint-disable
  no-console,
  no-multi-spaces,
  func-names1,
  object-curly-newline,
  prefer-arrow-callback,
  no-param-reassign,
  no-restricted-globals,
  no-alert,
  no-plusplus,
  no-restricted-properties,
  object-shorthand,
  no-shadow,
  key-spacing,
  no-nested-ternary,
*/
/* global d3, mapboxgl, topojson */

// Variables
const dataSet = window.location.search.indexOf('dataFile=2015') !== -1 ? 'old' : 'new';
let zipData = 'cazipgeo.txt';
const suspData = dataSet === 'old' ? 'suspensions.txt' : 'suspensions2016.txt';
const countyTopo = 'county4.json';
const zipTopo = 'ziptopo6.json';
// let povDist;
let counties;
let zipcodes;
let data;
let zipGeo;
let countyZips;
let map;
let map2;
const bins = 10;
let currGamma = 0.15;
let currDim = 1;
const legendElemWidth = 35;
const legendElemHeight = 18; // 13;
const legendSvgHeight = bins * legendElemHeight + 20;
const legendSvgWidth = 128;
const legendMarginLeft = 47;
const legendMarginTop = 10;
const fmt = d3.format('.0f');
// const fmt1 = d3.format('.1f');
const fmtP = d3.format(',.2p');
const targets = [
  { name: 'SF Bay Area', location: [-122.35, 37.78], zoom: 10.0, bearing: 0, speed: 1, curve: 1 },
  { name: 'Central LA',  location: [-118.36, 33.92], zoom:  9.9, bearing: 0, speed: 1, curve: 1 },
  { name: 'Sacramento',  location: [-121.50, 38.53], zoom:  9.9, bearing: 0, speed: 1, curve: 1 },
  { name: 'San Diego',   location: [-117.16, 32.72], zoom: 10.4, bearing: 0, speed: 1, curve: 1 },
];

const dimensions = [
  {
    prop: 'FTAFTPS100',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'DL. Suspension Rate',
    inverse: false,
    gamma: 0.15, // 0.40, // 0.70,
    opacity: 0.75, // 0.85,
    invert: false,
    color: 'darkred',
    // dist: d3.range(bins)
  },
  {
    prop: 'povrate',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'Poverty Rate',
    inverse: false,
    gamma: 0.15, // 0.50,
    opacity: 0.80,
    invert: false,
    color: 'mediumblue',
  },
  /*
  {
    prop: 'IncK',
    preUnit: '$',
    postUnit: 'K',
    fmt: fmt,
    divide: 1,
    title: 'Average Income (inverted)',
    inverse: true,
    gamma: 0.18, //0.50,
    opacity: 0.80,
    invert: false,
    color: 'darkgreen',
  },
  */
  {
    prop: 'Black',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'African American %',
    inverse: false,
    gamma: 0.15, // .50,
    opacity: 0.80,
    invert: false,
    color: 'purple',
  },
  {
    prop: 'Hisp',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'Latino %',
    inverse: false,
    gamma: 0.15, // 0.50,
    opacity: 0.80,
    invert: false,
    color: 'teal',
  },
  {
    prop: 'Asian',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'Asian %',
    inverse: false,
    gamma: 0.15, // 0.50,
    opacity: 0.80,
    invert: false,
    color: 'indianred',
  },
  {
    prop: 'WhiteNH',
    preUnit: '',
    postUnit: '',
    fmt: fmtP,
    divide: 100,
    title: 'White (Non-Latino) %',
    inverse: false,
    gamma: 0.15, // 0.50,
    opacity: 0.80,
    invert: false,
    color: 'dimgray',
  },
];

// Define map layers
const layerStack0 =  [
  {
    id: 'countiesArea',
    interactive: true,
    source: 'counties',
    type: 'fill',
    paint: {
      'fill-color': 'white',
      'fill-opacity': 0.1, // 0.01
    },
  },
  {
    id: 'countiesLine',
    source: 'counties',
    type: 'line',
    paint: {
      'line-color': '#999',
      'line-width': 1,
    },
  },
];

const layerStack2 = [
  {
    id: 'zipcodesLine',
    source: 'zipcodes',
    type: 'line',
    paint: {
      'line-color': 'darkred',
      'line-width': 0, // 0.5,
    },
  },
];

const loader = document.getElementById('loader');


// Sets the position of the overlay
function setOverlayPos() {
  const main = d3.select('#main');
  const height = main.node().offsetHeight;

  main.style('top', () => `${Math.max(10, window.innerHeight - height - 25)}px`);
}

// Window resize handler
function setWindowSize() {
  const width = (window.innerWidth - 6) / 2;
  d3.select('#map').style('width', `${width}px`);
  d3.select('#map2').style('width', `${width}px`);

  setOverlayPos();
}

// Calculate gamma (image contrast)
function calcGamma(val, gamma) {
  return Math.pow(val, (1 / gamma));
}

// Updates the legend with colors, opacities and threshold text
function updateLegend(map, dim) {
  const data = d3.range(bins).map((e, i) => {
    const obj = {};
    obj.color = dim.color;
    // let gammaArg = dim.inverse ? (bins - i + 1) / bins : (i + 1) / bins;
    const gammaArg = (i + 1) / bins;
    obj.opacity = calcGamma(gammaArg, dim.gamma) * dim.opacity;
    obj.value = dim.dist[i];
    obj.preUnit = dim.preUnit;
    obj.postUnit = dim.postUnit;
    obj.fmt = dim.fmt;
    obj.divide = dim.divide;
    obj.inverse = dim.inverse;

    return obj;
  });

  const tickData = data.slice();
  tickData.push({
    last: true,
    value: dim.range[1],
    preUnit: dim.preUnit,
    postUnit: dim.postUnit,
    fmt: dim.fmt,
    divide: dim.divide,
    inverse: dim.inverse,
  });
  if (dim.inverse) tickData.reverse();

  // var svg = d3.select('#' + map + 'LegendSvg').select('g')
  const svg = d3.select(`#${map}LegendSvg`).select('g');

  // Append opaque background
  svg.selectAll('.backgroundRect')
    .data([{
      width: legendElemWidth,
      height: legendElemHeight * bins,
      x: legendMarginLeft,
      y: legendMarginTop,
      color: 'white',
      opacity: 1,
    }])
    .enter().append('rect')
    .attr('class', 'backgroundRect')
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.height)
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .style('fill', (d) => d.color)
    .style('opacity', (d) => d.opacity);

  const boxes = svg.selectAll('.foregroundRect').data(data);

  boxes
    .enter().append('rect')
    .attr('class', 'foregroundRect')
    .attr('width', legendElemWidth)
    .attr('height', legendElemHeight)
    .attr('x', legendMarginLeft)
    .attr('y', (d, i) => (legendMarginTop + i * legendElemHeight))
    .style('stroke', 'gray');

  boxes
    .style('fill', (d) => d.color)
    .style('opacity', (d) => (d.opacity + 0.0001));

  svg.selectAll('.leftTick')
    .data(tickData)
    .enter().append('line')
    .attr('class', 'leftTick')
    .attr('x1', legendMarginLeft - 5)
    .attr('x2', legendMarginLeft + legendElemWidth + 5)
    .attr('y1', (d, i) => (legendMarginTop + i * legendElemHeight))
    .attr('y2', (d, i) => (legendMarginTop + i * legendElemHeight))
    .style('stroke', 'gray');

  svg.selectAll('.leftScale')
    .data(tickData)
    .enter().append('text')
    .attr('class', 'leftScale')
    .attr('x', legendMarginLeft - 6)
    .attr('y', (d, i) => (legendMarginTop + 3 + i * legendElemHeight))
    .text((d, i) => `${(i / bins) * 100}%`)
    .attr('text-anchor', 'end')
    .style('font-size', '10px');

  const rightScale = svg.selectAll('.rightScale').data(tickData);

  rightScale
    .enter()
    .append('text')
    .attr('class', 'rightScale');

  rightScale
    .attr('x', legendMarginLeft + legendElemWidth + 6)
    .attr('y', (d, i) => (legendMarginTop + 3 + i * legendElemHeight))
    .text((d) => (d.preUnit + d.fmt(d.value  / d.divide) + d.postUnit))
    .attr('text-anchor', 'start')
    .style('font-size', '10px');

  svg.selectAll('.leftLegendTitle')
    .data([{ text: 'Percentiles', rotate: '270' }])
    .enter().append('text')
    .attr('class', 'leftLegendTitle')
    .style('text-anchor', 'middle')
    .attr('transform', 'rotate(270)')
    .attr('x', () => (-legendSvgHeight / 2))
    .attr('y', 12)
    .style('font-weight', 'bold')
    .text('Percentiles');

  svg.selectAll('.rightLegendTitle')
    .data([{ text: 'Thresholds', rotate: '90' }])
    .enter().append('text')
    .attr('class', 'rightLegendTitle')
    .style('text-anchor', 'middle')
    .attr('transform', 'rotate(90)')
    .attr('x', () => (legendSvgHeight / 2))
    .attr('y', -115)
    .style('font-weight', 'bold')
    .text('Thresholds');

  svg.selectAll('.percentileTracker')
    .data([{ radius: 4, percentile: 3 }])
    .enter().append('circle')
    .attr('class', 'percentileTracker')
    .attr('cx', (legendMarginLeft + legendElemWidth / 2))
    .attr('cy', (d) => (d.percentile * legendElemHeight + 1))
    .attr('r',  (d) => (d.radius))
    .style('fill', 'black');
}


function setDimension(dim, g, o, c) {
  const d = dimensions[dim];
  if (g !== undefined) {
    d.gamma = +g;
    currGamma = d.gamma;
  }
  if (o !== undefined) d.opacity = +o;
  if (c !== undefined) d.color = c;
  currDim = dim;
  d.gamma = currGamma;

  d3.range(bins).forEach((p) => {
    const layerId = `dataLayer${p}`;
    map2.setFilter(layerId, d.filters[p]);
    map2.setPaintProperty(layerId, 'fill-color', d.color);
    const gammaArg = d.inverse ? (bins - p + 1) / bins : (p + 1) / bins;
    map2.setPaintProperty(layerId, 'fill-opacity', calcGamma(gammaArg, d.gamma) * d.opacity);
  });

  d3.select('#map2Title > .header').text(d.title);
  d3.select('#contrastRange').property('value', d.gamma * 100);
  d3.select('#contrastText').text(fmt(d.gamma * 100));
  d3.select('#opacityRange').property('value', d.opacity * 100);
  d3.select('#opacityText').text(fmt(d.opacity * 100));

  // Update legend
  updateLegend('map2', d);
}

function getDimension() {
  return currDim;
}

function setPercentileMarker(map, percentile, inverse) {
  const pos = percentile === -1
    ? -100
    : inverse
      ? (bins - percentile) * legendElemHeight
      : (percentile + 1) * legendElemHeight;

  // d3.select('#' + map + 'LegendSvg').select('g').select('.percentileTracker')
  d3.select(`#${map}LegendSvg`)
    .select('g')
    .select('.percentileTracker')
    .attr('cy', () => pos);
}

function updatePercentileMarker(zipCode) {
  let idx = -1;
  let idx2 = -1;
  let inverse = false;
  let inverse2 = false;

  if (zipCode === '') {
    // console.log('remove')
  } else {
    const data = zipData[zipCode];
    if (data) {
      // Handle map (dim 0)
      let dim = dimensions[0];
      let value = data[dim.prop];
      let { dist } = dim;

      dist.some((d) => {
        if (d > value) {
          return true;
        }
        idx++;
        return false;
      });
      inverse = dim.inverse;

      // Handle map2
      dim = dimensions[getDimension()];
      value = data[dim.prop];
      dist = dim.dist;
      dist.some((d) => {
        if (d > value) {
          return true;
        }
        idx2++;
        return false;
      });
      inverse2 = dim.inverse;
    }
  }

  // Set the marker
  setPercentileMarker('map', idx, inverse);
  setPercentileMarker('map2', idx2, inverse2);
}

// Manages the side panel
function manageSidePanel(data) {
  const controls = d3.select('#controls');

  // Remove current elements
  controls.selectAll('p').remove();

  // Add new p elements
  controls.selectAll('p')
    .data(data)
    .enter().append('p')
    .html((d) => d);

  setOverlayPos();
}


function mouseMove(container, e) {
  const fmtPct = d3.format(',.1%');
  const fmtInt = d3.format(',d');
  const fmtFloat = d3.format('.1f');

  // console.log('container', container);
  const t = container === 'map'
    ? { tracker: 'map2', noTracker: 'map' }
    : { tracker: 'map', noTracker: 'map2' };

  d3.select(`#${t.tracker}Tracker`)
    .style('left', `${e.point.x}px`)
    .style('top', `${e.point.y}px`);

  d3.select(`#${t.noTracker}Tracker`)
    .style('left', '-40px')
    .style('top', '-40px');

  map.featuresAt(e.point, { radius: 5 }, function (error, features) {
    if (error) throw error;
    if (features.length === 0) return;

    // Separate county and zip code entries in the features array
    // const countyInfo = features.filter(function (d) { if (d.properties.ALAND !== undefined) return true; });
    // const countyInfo = features.filter(function (d) { return d.properties.ALAND !== undefined; });
    const countyInfo = features.filter((d) => d.properties.ALAND !== undefined);


    // const zipInfo = features.filter(function (d) { if (d.properties.City !== undefined) return true; });
    // const zipInfo = features.filter(function (d) { return d.properties.City !== undefined; });
    const zipInfo = features.filter((d) => d.properties.City !== undefined);

    // Clear properties
    const item = {
      County: '',
      ZipCode: '',
      Places: '',
      FTAFTPS100: '',
      City: '',
      povrate: '',
      Pop15Plus: '',
      IncK: '',
      Black: '',
      Hisp: '',
      Asian: '',
      White: '',
    };

    // Obtain county name from first item in county array
    if (countyInfo.length > 0) {
      item.County = countyInfo[0].properties.NAME;
    }

    // Obtain zip code info from first item in zip code array
    if (zipInfo.length > 0) {
      item.ZipCode =    zipInfo[0].properties.zip;
      item.Places =     zipInfo[0].properties.Places;
      item.FTAFTPS100 = zipInfo[0].properties.FTAFTPS100;
      item.City =       zipInfo[0].properties.City;
      item.povrate =    zipInfo[0].properties.povrate;
      item.Pop15Plus =  zipInfo[0].properties.Pop15Plus;
      item.IncK =       zipInfo[0].properties.IncK;
      item.Black =      zipInfo[0].properties.Black;
      item.Hisp =       zipInfo[0].properties.Hisp;
      item.Asian =      zipInfo[0].properties.Asian;
      item.White =      zipInfo[0].properties.WhiteNH;
    }

    // Set the text in the overlay panel
    /*
    var text = [
      'Zip Code: <b>' + item.ZipCode + '</b>',
      'Place: <b>' + item.Places + '</b>',
      'County: <b>' + item.County + '</b>',
      'Suspensions: <b>' + fmtPct(item.FTAFTPS100 / 100) + '</b>',
      'Poverty Rate: <b>' + fmtPct(item.povrate / 100) + '</b>',
      'Population 15y+: <b>' + fmtInt(item.Pop15Plus) + '</b>',
      'Avg Income: <b>' + fmtFloat('' + item.IncK) + 'K</b>',
      'Black: <b>' + fmtPct('' + item.Black / 100) + '</b>',
      'Hispanic: <b>' + fmtPct('' + item.Hisp / 100) + '</b>',
      'Asian: <b>' + fmtPct('' + item.Asian / 100) + '</b>',
      'White: <b>' + fmtPct('' + item.White / 100) + '</b>'
    ];
    */
    // console.log('item', item)
    const text = [
      '<b>Location: </b>' +
          ' <b>' + item.Places + '</b>' +
          ' Zip: ' + item.ZipCode +
          ' (' + item.County + ' County)',
      '<b>DL. Suspension Rate: ' + fmtPct(item.FTAFTPS100 / 100) + '</b>',
      '<b>Poverty Rate: ' + fmtPct(item.povrate / 100) + '</b>',
      '<b>Population 15y+: ' + fmtInt(item.Pop15Plus) + '</b>',
      '<b>Avg Income: $' + fmtFloat('' + item.IncK) + 'K</b>',
      '<b>Racial composition: </b>' +
          ' Black: ' + fmtPct('' + item.Black / 100) +
          ' Lat: ' +  fmtPct('' + item.Hisp  / 100) +
          ' Asian: ' + fmtPct('' + item.Asian / 100) +
          ' White: ' + fmtPct('' + item.White / 100)
    ];

    // Update panel
    manageSidePanel(text);

    // Update percentile marker
    updatePercentileMarker(item.ZipCode);
  });
}

function flyTo(target) {
  map.flyTo({
    // These options control the ending camera position: centered at
    // the target, at zoom level 9, and north up
    center: target.location,
    zoom: target.zoom,
    bearing: target.bearing,

    // These options control the flight curve, making it move
    // slowly and zoom out almost completely before starting
    // to pan
    speed: target.speed,
    curve: target.curve,

    // This can be any easing function: it takes a number between
    // 0 and 1 and returns another number between 0 and 1
    easing: (t) => t,
  });
}

function fly(idx) {
  flyTo(targets[idx]);
}

function rangeContrastEvent() {
  const elem = d3.select(this);
  const value = elem.property('value');
  d3.select('#contrastText').text(fmt(value));

  const dim = getDimension();
  setDimension(dim, value / 100);
}

function rangeOpacityEvent() {
  const elem = d3.select(this);
  const value = elem.property('value');
  d3.select('#opacityText').text(value);

  const dim = getDimension();
  const d = dimensions[dim];
  d.opacity = value / 100;

  setDimension(dim, d.gamma, d.opacity, d.color);
}

function updateMainContrast() {
  const d = dimensions[0];
  d.gamma = currGamma;
  d3.range(bins).forEach((p) => {
    const layerId = `dataLayer${p}`;

    // map.setFilter(layerId, d.filters[p])
    // map.setPaintProperty(layerId, 'fill-color', d.color);
    const gammaArg = d.inverse
      ? (bins - p + 1) / bins
      : (p + 1) / bins;
    map.setPaintProperty(layerId, 'fill-opacity', calcGamma(gammaArg, d.gamma) * d.opacity);
  });

  // Update legend
  updateLegend('map', d);
}

function initMap(container, prop, color, gamma, opacity, levels, filters, title, dims) {
  d3.select('#message').text(`Initializing map in container: ${container}...`);
  /*
  console.log('container', container)
  console.log('prop', prop)
  console.log('color', color)
  console.log('gamma', gamma)
  console.log('opacity', opacity)
  console.log('levels', levels)
  console.log('filters', filters)
  console.log('title', title)
  console.log('dims', dims)
  */
  const dataLayers = [];

  for (let p = 0; p < bins; p++) {
    // add the layer and filters to the dataLayers array
    dataLayers.push({
      // id: 'dataLayer' + p,
      id: `dataLayer${p}`,
      interactive: true,
      type: 'fill',
      source: 'zipcodes',
      paint: {
        'fill-color': color,
        'fill-opacity': calcGamma((p + 1) / bins, gamma) * opacity,
      },
      filter: filters[p],
    });
  }

  const layers = [];
  layerStack0.forEach((d) => { layers.push(d); });
  dataLayers.forEach((d) => { layers.push(d); });
  layerStack2.forEach((d) => { layers.push(d); });

  // Init the map
  d3.select('#message').text('Creating map...');

  // New SF based initial view
  const map = new mapboxgl.Map({
    container,
    maxZoom: 14, // 13
    minZoom: 4,
    zoom: 10,
    center: [-122.35, 37.78],
    style: 'mapbox://styles/mapbox/bright-v8',
    hash: false,
  });
  d3.select('#message').text('Created map...');

  // Add controls to the map, and event handler
  map.addControl(new mapboxgl.Navigation());
  d3.selectAll('.mapboxgl-ctrl-compass').on('click', () => {
    d3.select('#tiltSlider').property('value', 0);
  });

  map.on('load', () => {
    loader.className = 'done';
    setTimeout(() => {
      loader.className = 'hide';
    }, 500);

    d3.select('#main').style('display', 'block');
    setWindowSize();

    d3.select('#map2DataSelect').style('display', 'block');
    d3.selectAll('.legend').style('display', 'block');
  });

  // Load the counties and zipcode layers at style.load event
  map.on('style.load', () => {
    // console.log('style.load...')
    d3.select('#message').text('Adding data layers...');

    // Add the two data sources before adding the layers
    // Note: extreme performance penalty if adding the data source repeatedly for each layer
    map.addSource('counties', {
      type: 'geojson',
      data: counties,
    });

    map.addSource('zipcodes', {
      type: 'geojson',
      data: zipcodes,
    });

    // Add the zip code layers
    layers.forEach((d, i) => {
      d3.select('#message').text(`Adding layer: ${i}'...`);
      map.addLayer(d);
    });

    d3.select('#message').text('Loading map layers – Done');
  });

  // const cursorTrackerDiv = d3.select('#' + container)
  const cursorTrackerDiv = d3.select(`#${container}`)
    .append('div')
    .attr('id', `${container}TrackerDiv`)
    .attr('class', 'trackerDiv')
    .style('position', 'absolute')
    .style('top', '0px')
    .style('left', '0px');

  cursorTrackerDiv
    .append('div')
    .attr('id', `${container}Tracker`)
    .attr('class', 'tracker')
    .style('position', 'absolute')
    .style('top', '-40px')
    .style('left', '-40px')
    .style('width', '7px')
    .style('height', '7px')
    .style('background-color', 'black')
    .style('border-radius', '50%');

  // Remove zip code area border when zoomed out
  map.on('zoom', () => {
    const zoom = map.getZoom();
    if (zoom < 9) {
      map.setPaintProperty('zipcodesLine', 'line-width', 0);
    } else {
      map.setPaintProperty('zipcodesLine', 'line-width', 0.5);
    }
  });

  // Update the overlay
  map.on('mousemove', function (e) {
    mouseMove(container, e);
  });

  // Create title elem above the map
  // const titleDiv = d3.select('#' + container)
  const titleDiv = d3.select(`#${container}`)
    .append('div')
    .attr('id', `${container}Title`)
    .attr('class', 'headerBox');

  titleDiv.append('h2')
    .attr('class', 'header')
    .text(title);

  // Create the legend div and svg (actual svg contents will be set later)
  const legendDiv = d3.select(`#${container}`)
    .append('div')
    .attr('id', `${container}Legend`)
    .attr('class', 'legend')
    .style('right', function () { return container === 'map2' ? null : '20px'; })
    .style('left', function () { return container === 'map2' ? '20px' : null; });

  legendDiv.append('label')
    .style('margin-left', `${(legendMarginLeft - 3)}px`)
    .text('Legend');

  legendDiv.append('svg')
    .attr('width', legendSvgWidth)
    .attr('height', legendSvgHeight)
    // .attr('id', container + 'LegendSvg')
    .attr('id', `${container}LegendSvg`)
    .append('g');

  // If dimensions array is passed in, then select elem to allow choice of data series
  if (dims) {
    // const dataSelectDiv = d3.select('#' + container)
    const dataSelectDiv = d3.select(`#${container}`)
      .append('div')
      .attr('id', `${container}DataSelect`)
      .attr('class', 'dataSelect')
      .style('right', function () { return container === 'map2' ? '20px' : null; })
      .style('left', function () { return container === 'map2' ? null : '20px'; });

    dataSelectDiv.append('label')
      .text('Select data series');

    dataSelectDiv.append('select')
      .on('change', function () {
        const elem = d3.select(this);
        const value = elem.property('value');
        dims.slice(1).some(function (d, i) {
          if (d.prop === value) {
            setDimension(i + 1);
            return true;
          }
          return false;
        });
      })
      .selectAll('option')
      .data(dims.slice(1))
      .enter()
      .append('option')
      .attr('value', function (d) { return d.prop; })
      .text(function (d) { return d.title; });

    // Is there a querystring showSettings parameter?
    const query = window.location.search;
    let display = 'none';
    if (query.indexOf('showSettings=true') !== -1) {
      display = 'block';
    }

    const rangeDiv = dataSelectDiv.append('div')
      .style('display', display);

    let span = rangeDiv.append('span')
      .style('display', 'block')
      .style('margin-top', '20px');

    span.append('label')
      .style('display', 'block')
      .text('Contrast');

    span.append('input')
      .attr('id', 'contrastRange')
      .attr('min', 0)
      .attr('max', 100)
      .attr('step', 1)
      .attr('value', 100)
      .attr('type', 'range')
      .style('width', '200px')
      .on('change', function () { rangeContrastEvent.call(this); })
      .on('input', function () { rangeContrastEvent.call(this); });

    span.append('p')
      .attr('id', 'contrastText')
      .style('margin-top', '0px')
      .text('value');

    span = rangeDiv.append('span')
      .style('display', display)
      .style('margin-top', '20px');

    span.append('label')
      .style('display', 'block')
      .text('Opacity');

    span.append('input')
      .attr('id', 'opacityRange')
      .attr('min', 0)
      .attr('max', 100)
      .attr('step', 1)
      .attr('value', 100)
      .attr('type', 'range')
      .style('width', '200px')
      .on('change', function () { rangeOpacityEvent.call(this); })
      .on('input', function () { rangeOpacityEvent.call(this); });

    span.append('p')
      .attr('id', 'opacityText')
      .style('margin-top', '0px')
      .text('value');

    // Create quick move select
    dataSelectDiv.append('label')
      .style('display', 'block')
      .style('margin-top', '15px')
      .text('Quick move');

    const flyToSelect = dataSelectDiv.append('select')
      .style('margin-bottom', '10px')
      .on('change', function () {
        const elem = d3.select(this);
        const value = elem.property('value');
        // console.log(value)
        flyTo(targets[+value]);
      });

    flyToSelect.selectAll('option')
      .data(targets)
      .enter().append('option')
      .property('value', function (d, i) { return i; })
      .text(function (d) { return d.name; });

    // Create contrast radio buttons
    const contrastData = [
      { label: 'High', value: 15, checked: true },
      { label: 'Medium', value: 40, checked: false },
      { label: 'Low', value: 80, checked: false },
    ];

    const contrastRadio = dataSelectDiv.append('div');
    contrastRadio.append('legend')
      .style('font-weight', 'bold')
      .style('padding', '0px')
      .style('margin-top', '5px')
      .text('Contrast');

    contrastRadio.selectAll('.contrastRadioBtn')
      .data(contrastData)
      .enter().append('label')
      .text(function (d) { return d.label; })
      .style('font-weight', 'normal')
      .append('input')
      .attr('type', 'radio')
      .attr('name', 'contrast')
      .attr('value', function (d) { return d.value; })
      .property('checked', function (d) { return d.checked; })
      .style('margin-right', '10px')
      .text(function (d) { return d.value; })
      .on('change', function () {
        const value = d3.select('input[name=contrast]:checked').property('value');
        // console.log('value', value)
        currGamma = value / 100;
        const dim = getDimension();
        setDimension(dim);
        updateMainContrast();
      });
  }

  // Return the map to caller
  return map;
}


function mapBoxInit() {
  d3.select('#message').text('Loading vector maps...');

  // Mapbox access token
  mapboxgl.accessToken = 'pk.eyJ1IjoiYm9lcmljIiwiYSI6IkZEU3BSTjQifQ.XDXwKy2vBdzFEjndnE4N7Q';

  // Process dimensions
  dimensions.forEach(function (dim) {
    // Get range
    const range = d3.extent(zipcodes.features, function (d) {
      return d.properties[dim.prop];
    });
    dim.range = range;

    // Get values
    const values = zipcodes.features
      .map(function (d) { return d.properties[dim.prop]; })
      .sort(function (a, b) { return a - b; });

    // Get distribution
    if (!dim.dist) {
      const dist = d3.range(bins).map(function (d) {
        return d3.quantile(values, d / bins);
      });
      dim.dist = dist;
    }

    // Generate filters
    const layerFilters = [];
    for (let p = 0; p < bins; p++) {
      let filters;
      if (p < bins - 1) {
        filters = [
          'all',
          ['>=', dim.prop, dim.dist[p]],
          ['<', dim.prop, dim.dist[p + 1]],
        ];
      } else {
        filters = [
          'all',
          ['>=', dim.prop, dim.dist[p]],
        ];
      }
      layerFilters.push(filters);
    }
    dim.filters = layerFilters;
  });

  d3.select('#message').text('Processed data dimensions...');

  // Init first (left) map
  let d = dimensions[0];
  d3.select('#message').text('Initializing first map panel...');
  map = initMap('map', d.prop, d.color, d.gamma, d.opacity, d.dist, d.filters, d.title);
  updateLegend('map', d);

  // Init second (right) map
  const dimensionList = dimensions
    .map(function (d) { return { prop: d.prop, title: d.title }; })
    .slice(0);
  d = dimensions[1];

  d3.select('#message').text('Initializing second map panel...');
  map2 = initMap('map2', d.prop, d.color, d.gamma, d.opacity, d.dist, d.filters, d.title, dimensionList);
  updateLegend('map2', d);

  d3.select('#message').text('Loading map layers...');
  d3.select('#contrastRange').property('value', d.gamma * 100);
  d3.select('#contrastText').text(fmt(d.gamma * 100));
  d3.select('#opacityRange').property('value', d.opacity * 100);
  d3.select('#opacityText').text(fmt(d.opacity * 100));

  // Init percentile markers
  setPercentileMarker('map', -1, false);
  setPercentileMarker('map2', -1, false);

  let disable = false;
  map.on('move', function () {
    if (!disable) {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();
      const bearing = map.getBearing();
      // console.log(center, zoom, pitch, bearing)

      disable = true;
      map2.setCenter(center);
      map2.setZoom(zoom);
      map2.setPitch(pitch);
      map2.setBearing(bearing);
      disable = false;
    }
  });

  map2.on('move', function () {
    if (!disable) {
      const center = map2.getCenter();
      const zoom = map2.getZoom();
      const pitch = map2.getPitch();
      const bearing = map2.getBearing();

      disable = true;
      map.setCenter(center);
      map.setZoom(zoom);
      map.setPitch(pitch);
      map.setBearing(bearing);
      disable = false;
    }
  });

  // Map pitch handlers
  function tiltSlider() {
    const elem = d3.select(this);
    const value = +elem.property('value');
    map.setPitch(value);
  }
  d3.select('#tiltSlider').on('change', function () { tiltSlider.call(this); });
  d3.select('#tiltSlider').on('input',  function () { tiltSlider.call(this); });

  // Establish handler for the 'how to use' div
  d3.select('#howToUse').on('click', function () {
    let state = d3.select('#instructions').style('display');
    if (state === 'none') state = 'block';
    else state = 'none';
    d3.select('#instructions').style('display', state);
    d3.select(this).text(function() {
      return state === 'none' ? 'How to use...' : 'How to use (close)';
    });

    setOverlayPos();
  });

  // Handler for 'sources' div
  d3.select('#sourcesTitle').on('click', function () {
    let state = d3.select('#sources').style('display');
    if (state === 'none') state = 'block';
    else state = 'none';
    d3.select('#sources').style('display', state);
    d3.select(this).text(function () {
      return state === 'none' ? 'About...' : 'About (close)';
    });

    setOverlayPos();
  });
}

// Set the initial window size
setWindowSize();

// Register window resize handler
window.onresize = () => {
  setWindowSize();
};

// Set initial position of overlay
setOverlayPos();

// Load zip code data
d3.tsv(zipData, function (_) {
  zipGeo = _;

  // Create object for quick lookup of a county's zip codes (used by code that dynamically
  // injects zip code geometry)
  countyZips = {};
  zipGeo.forEach(function (d) {
    const key = d.County.trim();
    if (countyZips[key] === undefined) countyZips[key] = [];
    countyZips[key].push(+d.ZipCode);
  });

  // Create data structure used to merge zip code and suspension data
  const obj = {};
  zipGeo.forEach(function (d) {
    const key = d.ZipCode.trim();
    obj[key] = d;
    delete obj[key].ZipCode;
  });
  zipGeo = obj; // Redefine zipGeo from array to object

  // Load driver license suspension data
  d3.select('#message', 'Loading driver license suspension data...');
  d3.tsv(suspData, function (suspensions) {
    console.log('Loaded driver license suspension data...');

    // Merge in the zip geo data and create main data structure
    data = suspensions.map(function (d) {
      const zipData = zipGeo[d.ZipCode];
      Object.keys(zipData).forEach(function (prop) { d[prop] = zipData[prop]; });
      return d;
    });

    // Convert to numbers
    data.forEach(function (d) {
      const props = Object.keys(d);
      props.forEach(function (prop) { d[prop] = (isNaN(+d[prop])) ? d[prop] : +d[prop]; });
    });

    // Sort data in ascending order (so highest suspension rates are drawn last and on top
    // of the stack)
    data.sort(function (a, b) {
      return a.FTAFTPS100 - b.FTAFTPS100;
    });

    // Create data structure for quick lookup (used by zip code geometry event handler)
    zipData = {};
    data.forEach(function (d) {
      zipData[d.ZipCode] = d;
    });

    // Load county geometry
    d3.select('#message').text('Loading county boundary data...');
    d3.json(countyTopo, function (error, county) {
      counties = topojson.feature(county, county.objects.CaliforniaCounty);
      console.log('Loaded county boundary data...');

      // Load zip code geometry
      d3.select('#message').text('Loading zip code boundary data...');
      d3.json(zipTopo, function (error, zip) {
        zipcodes = topojson.feature(zip, zip.objects.zip);
        console.log('Loaded zip code boundary data...');

        const caZipCodeMin = 90001;
        const caZipCodeMax = 96162;
        zipcodes.features = zipcodes.features.filter(function (item) {
          return item.properties.zip >= caZipCodeMin && item.properties.zip <= caZipCodeMax;
        });

        const nodataZipCodes = [];
        zipcodes.features.forEach(function (d) {
          d.properties.zip = +d.properties.zip;
          const zipCode = d.properties.zip;

          if (zipData[zipCode] === undefined) {
            nodataZipCodes.push(zipCode);
            d.properties.noData = true;
          } else {
            d.properties.noData = false;
            d.properties.ZipCode = zipData[d.properties.zip].ZipCode;
            d.properties.Places = zipData[d.properties.zip].Places;
            d.properties.City = zipData[d.properties.zip].City;
            d.properties.FTAFTPS100 = zipData[d.properties.zip].FTAFTPS100;
            d.properties.povrate = zipData[d.properties.zip].povrate;
            d.properties.Pop15Plus = zipData[d.properties.zip].Pop15Plus;
            d.properties.IncK = zipData[d.properties.zip].IncK;
            d.properties.Black = zipData[d.properties.zip].Black;
            d.properties.Hisp = zipData[d.properties.zip].Hisp;
            d.properties.WhiteNH = zipData[d.properties.zip].WhiteNH;
            d.properties.Asian = zipData[d.properties.zip].Asian;
          }
        });

        // Log number of zip codes with no data
        console.log('Zip codes with no data: ', nodataZipCodes.length);

        zipcodes.features = zipcodes.features.filter(function (d) {
          return !d.properties.noData;
        });
        console.log('Zip codes with data: ', zipcodes.features.length);

        // Test support for maxboxgl
        if (!mapboxgl.supported()) {
          // No support, alert user
          alert('Your browser does not support Mapbox GL');
        } else {
          // Initialize the mapbox map
          mapBoxInit();
        }
      });
    });
  });
});
