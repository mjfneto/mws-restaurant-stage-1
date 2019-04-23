let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

if (navigator.serviceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log(`ServiceWorker was found and is registered, scope: ${registration.scope}`);
    }).catch(error => {
      console.log(`ServiceWorker registration failed: ${error}`);
    });
  });
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML. Sets aria-* attributes too.
 * New attributes can be added to ariaAtrrs, and switch
 * can be used in cases where only the name of an attribute
 * is needed, if its value is given in other function or file.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');

  const ariaAttrs = [
    { attr: 'aria-selected', value: 'false' }
  ]

  neighborhoods.forEach((neighborhood, index) => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;

    for (let aria of ariaAttrs) {
      switch (aria.attr) {
        default:
          option.setAttribute(aria.attr, aria.value);
      }
    }

    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  const ariaAttrs = [
    {attr: 'aria-selected', value: 'false'}
  ]

  cuisines.forEach((cuisine, index) => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;

    for (let aria of ariaAttrs) {
      switch (aria.attr) {
        default:
          option.setAttribute(aria.attr, aria.value);
      }
    }

    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoibWpmbmV0byIsImEiOiJjanVkMTl4dXQwYzh4M3pwOHB5cjB5ZDJmIn0.1clvD37JU4YDLjRdOxdTsw',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = (component) => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  setAriaSelectedToFilter(component, cSelect, nSelect, cIndex, nIndex);

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      if (restaurants.length === 0) {
        fillNoResultsHTML(cuisine, neighborhood);
      } else {
        fillResultsHTML(restaurants.length, cuisine, neighborhood);
      }
    }
  })
}

/**
 * All selected options have aria-selected set to 'true'. All options that are not selected have aria-selected set to 'false'.
 */
function setAriaSelectedToFilter(component, cSelect, nSelect, cIndex, nIndex) {
  switch (component) {
    case undefined:
      cSelect[0].setAttribute('aria-selected', 'true');
      nSelect[0].setAttribute('aria-selected', 'true');
      break;
    case cSelect:
      for (option of cSelect.children) {
        if (option.getAttribute('aria-selected') === 'true'){
          option.setAttribute('aria-selected', 'false');
        } else {
          continue;
        };
      }
      cSelect[cIndex].setAttribute('aria-selected', 'true');
      break;
    case nSelect:
      for (option of nSelect.children) {
        if (option.getAttribute('aria-selected') === 'true'){
          option.setAttribute('aria-selected', 'false');
        } else {
          continue;
        };
      }
      nSelect[nIndex].setAttribute('aria-selected', 'true');
      break;
  }
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.querySelector('.restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.querySelector('.restaurants-list');

  restaurants.forEach((restaurant, index) => {
    ul.insertAdjacentHTML('beforeend', createRestaurantHTML(restaurant, index));
  });
  addMarkersToMap();
}

/**
 * Creates an HTML to display search results and adds it to the page.
 */
function fillResultsHTML(length, cuisine, neighborhood) {
  const resultsContainer = document.querySelector('.results-container');
  resultsContainer.classList.remove('-inactive');

  if (cuisine !== 'all' || neighborhood !== 'all') {

    if (cuisine !== 'all' && neighborhood === 'all') {
      if (length === 1) {
        resultsContainer.innerHTML = `<p class="results">${length} ${cuisine} restaurant found</p>`;
      } else {
        resultsContainer.innerHTML = `<p class="results">${length} ${cuisine} restaurants found</p>`;
      }
      return;
    }

    if (cuisine === 'all' && neighborhood !== 'all') {
      if (length === 1) {
        resultsContainer.innerHTML = `<p class="results">${length} restaurant found in ${neighborhood}</p>`;
      } else {
        resultsContainer.innerHTML = `<p class="results">${length} restaurants found in ${neighborhood}</p>`;
      }
      return;
    }

    if (length === 1) {
      resultsContainer.innerHTML = `<p class="results">${length} ${cuisine} restaurant found in ${neighborhood}</p>`;
    } else {
      resultsContainer.innerHTML = `<p class="results">${length} ${cuisine} restaurants found in ${neighborhood}</p>`;
    }
    return;
  }
  resultsContainer.innerHTML = `<p class="results">${length} restaurants found</p>`;
}

/**
 * Creates an HTML to display an error message and adds it to the page.
 */
function fillNoResultsHTML(cuisine, neighborhood) {
  const ul = document.querySelector('.restaurants-list');
  const resultsContainer = document.querySelector('.results-container');
  resultsContainer.classList.add('-inactive');

  ul.innerHTML = `
    <li id="noresults-container" class="noresults-container" role="status">
      <label for="noresults-container">We couldn't find ${cuisine} restaurants in ${neighborhood}.</label>
      <p class="noresults-queryicon" aria-hidden="true">🍽️</p>
    <li>
    `
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  return `
    <li class="info-container" style="background-image: url(${DBHelper.imageUrlForRestaurant(restaurant)})" role="option" aria-labelledby="info-container-label${restaurant.id}">
      <div class="info-wrapper">
        <div id="info-container-label${restaurant.id}">
          <h1><span>${restaurant.name}</span></h1>
          <p><span>${restaurant.neighborhood}</span></p>
          <p><span>${restaurant.address}</span></p>
        </div>
        <a id="more-button" href="${DBHelper.urlForRestaurant(restaurant)}" type="button" role="button">View Details</a>
      </div>
    </li>
  `;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */