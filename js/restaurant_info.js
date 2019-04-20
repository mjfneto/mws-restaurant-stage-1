let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      setAriaToMap(restaurant);
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Sets aria-* attrs to map container.
 */
function setAriaToMap(restaurant) {
  const mapBox = document.querySelector('#map');

  const ariaAttrs = [
    { attr: 'aria-label', value: `${restaurant.name} pinned location`}
  ]

  for (let aria of ariaAttrs) {
  mapBox.setAttribute(aria.attr, aria.value);
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 * It also adds required aria attributes to table elements.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const restaurantHours = document.getElementById('restaurant-hours');

  const week = Object.entries(operatingHours);

  restaurantHours.setAttribute('aria-rowcount', `${week.length}`);

  for (const [day, schedules] of week) {

    let timetable = schedules.split(',');

    timetable = timetable.map(shift => {
      return shift.replace('-', 'to');
    })

    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');

    const tdDay = document.createElement('td');
    tdDay.setAttribute('role', 'cell');
    tdDay.setAttribute('aria-rowindex', '1');
    tdDay.innerHTML = day;
    tr.insertAdjacentElement('beforeend', tdDay);

    timetable.forEach((shift, index) => {
      const tdShift = document.createElement('td');
      tdShift.setAttribute('role', 'cell');
      tdShift.setAttribute('aria-rowindex', `${index + 2}`);
      tdShift.innerHTML = `${shift ? shift : ''}`;
      tr.insertAdjacentElement('beforeend', tdShift);
    })

    restaurantHours.insertAdjacentElement('beforeend', tr);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  container.classList.add('col-12');

  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.insertAdjacentElement('beforeend', title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.insertAdjacentElement('beforeend', noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.insertAdjacentHTML('beforeend', createReviewHTML(review));
  });
  container.insertAdjacentElement('beforeend', ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  return `
    <li>
      <article>
        <div class="name-date">
          <h3 class="name-date">${review.name}</h3><p>${review.date}</p>
        </div>
        <div class="rating-comments">
          <p class="rating">Rating: ${review.rating}</p>
          <p class="comments">${review.comments}</p>
        </div>
      </article>
    </li>
  `
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const anchor = document.createElement('a');
  li.append(anchor);
  anchor.innerHTML = restaurant.name;
  anchor.setAttribute('href', location.href);
  anchor.setAttribute('role', 'link');
  anchor.setAttribute('aria-current', 'page');

  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
