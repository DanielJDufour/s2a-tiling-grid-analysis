const { readFileSync } = require('fs');
const { kml } = require("@tmcw/togeojson");
const bbox = require("@turf/bbox").default;
const centroid = require("@turf/centroid").default;

// node doesn't have xml parsing or a dom. use xmldom
const { DOMParser } = require("xmldom");


// from proj4js/mgrs
function getLetterDesignator(latitude) {
  if (latitude <= 84 && latitude >= 72) {
    // the X band is 12 degrees high
    return 'X';
  } else if (latitude < 72 || latitude >= -80) {
    // Latitude bands are lettered C through X, excluding I and O
    const bandLetters = 'CDEFGHJKLMNPQRSTUVWX';
    const bandHeight = 8;
    const minLatitude = -80;
    const index = Math.floor((latitude - minLatitude) / bandHeight);
    return bandLetters[index];
  } else if (latitude > 84 || latitude < -80) {
    //This is here as an error flag to show that the Latitude is
    //outside MGRS limits
    return 'Z';
  }
}

function getPosition(centroidLat, centroidLon, point) {
  const [ longitude, latitude] = point;
  if (longitude < centroidLon) {
    if (latitude < centroidLat) {
      return 'bottom-left';
    } else if (latitude > centroidLat) {
      return 'top-left';
    } else {
      return 'latitude on axis';
    }
  } else if (longitude > centroidLon) {
    if (latitude < centroidLat) {
      return 'bottom-right';
    } else if (latitude > centroidLat) {
      return 'top-right';
    } else {
      return 'latitude on axis';
    }
  } else {
    console.log("longitude on axis");
  }
}

const text = readFileSync('/tmp/S2A_OPER_GIP_TILPAR_MPC__20151209T095117_V20150622T000000_21000101T000000_B00.kml', 'utf8');

const parsed = new DOMParser().parseFromString(text);
//console.log("parsed:", parsed);

const converted = kml(parsed);

const info = {
  centroid: 0,
  first: 0,
  second: 0,
  third: 0,
  fourth: 0,
  'point': 0,
  'maxY': 0,
  'minY': 0,
  'total': 0,
  'top-left': 0,
  'top-right': 0,
  'bottom-left': 0,
  'bottom-right': 0
};

const more = {
  centroid: 0,
  first: 0,
  second: 0,
  third: 0,
  fourth: 0,
  'point': 0,
  'maxY': 0,
  'minY': 0,
  'total': 0
};

converted.features.forEach(feature => {



  const mgrs = feature.properties.name;

  if (mgrs === "50SMK") {
    console.log("mgrs:", mgrs)
    console.log(JSON.stringify(mgrs, undefined, 2));
  }

  if (mgrs === "50TMK") {
    console.log("mgrs:", mgrs)
    console.log(JSON.stringify(feature.geometry, undefined, 2));
  }

  const point = feature.geometry.geometries.find(geometry => geometry.type === 'Point');

  const polygon = feature.geometry.geometries.find(geometry => geometry.type === 'Polygon');

  const [ longitude, latitude, elevation ] = point.coordinates;

  const [ minX, minY, maxX, maxY ] = bbox(polygon);

  //console.log(JSON.stringify(feature.geometry, undefined, 2));
  //console.log("polygon.coordinates.length:", polygon.coordinates[0].length);
  //console.log(polygon.coordinates[0]);

  /* example of polygon coordinates

  [
    [ 180, -73.0597374076, 0 ], // bottom-right
    [ 176.8646237862, -72.9914734628, 0 ], // bottom-left
    [ 177.1893403617, -72.0124778858, 0 ], // top-left
    [ 180, -72.0733311788, 0 ], // top-right
    [ 180, -73.0597374076, 0 ]
  ]

  */

  //exit();

  const [ first, second, third, fourth ] = polygon.coordinates[0];

  const centerPoint = centroid(polygon);

  const centroidLat = centerPoint.geometry.coordinates[1];
  const centroidLon = centerPoint.geometry.coordinates[0];

  const s2aLetter = mgrs.match(/\d+([A-Z])/)[1];

  const order = [
    getPosition(centroidLat, centroidLon, first),
    getPosition(centroidLat, centroidLon, second),
    getPosition(centroidLat, centroidLon, third),
    getPosition(centroidLat, centroidLon, fourth)
  ];

  if (first[1] <= 84 && first[1] >= -80) {
    info.total++;

    const pointMatch = getLetterDesignator(latitude) === s2aLetter;
    if (pointMatch) info.point++;

    const minYMatch = getLetterDesignator(minY) === s2aLetter;
    if (minYMatch) info.minY++;

    const maxYMatch = getLetterDesignator(maxY) === s2aLetter;
    if (maxYMatch) info.maxY++;

    const centroidMatch = getLetterDesignator(centroidLat) === s2aLetter;
    if (centroidMatch) info.centroid++;

    const firstMatch = getLetterDesignator(first[1]);
    if (firstMatch) {
      info.first++;
      const position = getPosition(centroidLat, centroidLon, first);
      info[position]++;
    }


    const secondMatch = getLetterDesignator(second[1]);
    if (secondMatch) {
      info.second++;
      const position = getPosition(centroidLat, centroidLon, second);
      info[position]++;
    }

    const thirdMatch = getLetterDesignator(third[1]);
    if (thirdMatch) {
      info.third++;
      const position = getPosition(centroidLat, centroidLon, third);
      info[position]++;
    }

    const fourthMatch = getLetterDesignator(fourth[1]);
    if (fourthMatch) {
      info.fourth++;
      const position = getPosition(centroidLat, centroidLon, fourth);
      info[position]++;
    }

    if (info[order]) info[order]++;
    else info[order] = 1;

    if (mgrs === "50TMK") {

      console.log("\n");
      console.log("mgrs:", mgrs);
      console.log("s2aLetter:", s2aLetter);
      console.log("getLetterDesignator(latitude): getLetterDesignator(,", latitude, ")");
      console.log("minYMatch:", minYMatch);
      console.log("maxYMatch:", maxYMatch);
      console.log("centroidLat:", centroidLat);
      console.log("centroidMatch:", centroidMatch);
      console.log("no point match for", JSON.stringify(feature, undefined, 2));

      if (pointMatch) more.point++;
      if (minYMatch) more.minY++;
      if (maxYMatch) more.maxY++;
      if (centroidMatch) more.centroid++;
      if (firstMatch) more.first++;
      if (secondMatch) more.second++;
      if (thirdMatch) more.third++;
      if (fourthMatch) more.fourth++;


      //exit();
    }
  }

});

console.log("info:", info);
console.log("when not a match based on point in KML:", more);