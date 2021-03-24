const form = document.querySelector('form');
const root = document.querySelector('.points-of-interest');
const key = 'pk.eyJ1IjoiaGlyYWRhYmJhc2kiLCJhIjoiY2ttbWJjNzJqMDh3aDJ3bzQ4eXp6cWJjZCJ9.PB8mTgztoMbR3VCzuKUYfQ';
const main = document.querySelector('main');
let defaultLat;
let defaultLng;

let defaultLoc;
let destinationLoc;
let map;

let options = {
  enableHighAccuracy: true,
  timeout: 7000,
  maximumAge: 0
};

function success(pos) {
  let crd = pos.coords;
  defaultLat = crd.latitude;
  defaultLng = crd.longitude;

  mapboxgl.accessToken = key;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [defaultLng, defaultLat],
    zoom: 14
  });

  defaultLoc = new mapboxgl.Marker().setLngLat([defaultLng, defaultLat]).addTo(map);
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error, options);

form.onsubmit = function(e) {
  e.preventDefault();
  root.textContent = '';
  let input = form.querySelector('input');
  getForPOI(input.value);
};

async function getForPOI(search) {
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${search}.json?proximity=${defaultLng},${defaultLat}&types=poi&access_token=${key}&limit=10`);
  const JSON = await response.json();

  JSON.features.forEach(location => {
    root.insertAdjacentHTML('beforeend', `
    <li class="poi" data-long="${location.center[0]}" data-lat="${location.center[1]}">
      <ul>
        <li class="name">${location.place_name.split(',')[0]}</li>
        <li class="street-address">${location.properties.address}</li>
        <li class="distance">${getDistanceFromLatLonInKm(defaultLng, defaultLat, location.center[0], location.center[1]).toFixed(2)}km</li>
      </ul>
    </li>`)
  });
}

root.onclick = e => {
  const loc = e.target.closest('.poi');

  if (loc !== null) {
    let areThereAnyMarkers = document.getElementsByClassName('mapboxgl-marker mapboxgl-marker-anchor-center');

    if (areThereAnyMarkers.length < 2) {
      addAndMove(loc.dataset.long, loc.dataset.lat);
    } else {
      destinationLoc.remove();
      map.removeLayer('LineString');
      map.removeSource('LineString');
      addAndMove(loc.dataset.long, loc.dataset.lat);
    }
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

async function addAndMove(lng, lat) {
  destinationLoc = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${defaultLng},${defaultLat};${lng},${lat}?alternatives=true&geometries=geojson&steps=true&access_token=${key}`);
  const JSON = await response.json();
  addLines(JSON.routes[0].geometry.coordinates);
}

function addLines(coordinate) {
  let geojson = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'geometry': {
        'type': 'LineString',
        'properties': {},
        'coordinates': coordinate
      }
    }]
  };

  map.addSource('LineString', {
    'type': 'geojson',
    'data': geojson
  });
  map.addLayer({
    'id': 'LineString',
    'type': 'line',
    'source': 'LineString',
    'layout': {
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      'line-color': '#BF93E4',
      'line-width': 5
    }
  });

  let coordinates = geojson.features[0].geometry.coordinates;
  let bounds = coordinates.reduce(function(bounds, coord) {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 150
  });
}