const fs = require('fs');
const cluster = {
    coordinates: [
      [21.840, 80.170],
      [21.850, 80.220],
      [21.815, 80.245],
      [21.790, 80.210],
      [21.800, 80.160]
    ]
};
const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...cluster.coordinates.map(c => [c[1], c[0]]), [cluster.coordinates[0][1], cluster.coordinates[0][0]]]]
        },
        properties: {}
      }
    ]
};
console.log(JSON.stringify(geojson, null, 2));
