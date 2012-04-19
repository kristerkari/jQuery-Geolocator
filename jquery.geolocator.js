(function($, window, document, undefined){
	'use strict';

	/*jshint eqnull: true */

	// plugin name, used with $.data
	var pluginName = 'jquery-geolocator',

	// Default settings / how to read these settings:
	// Setting name | setting default value | setting type (Boolean/Number/String) | setting instructions
	defaultSettings = {
		manualCheck:        false, // Boolean - Set to true if you want your visitor to be able to manually check geolocation.
		sorting:            true, // Boolean - Set to false if you don't want to sort addresses by distance.
		debugMode:          false, // Boolean - Set to true to enable error debugging (only works in browsers that have window.console).
		enableHighAccuracy: false, //Boolean - Setting for HTML5 geolocation "enableHighAccuracy". Setting to true locating takes longer but is more accurate.
		timeout:            6000, // Number - Setting for HTML5 geolocation "timeout". Default: times out in 6 seconds.
		maximumAge:         60000, // Number - Setting for HTML geolocation "maximunAge". Default: don't re-get geolocation if it is less than 1min old.
		apiKey:             null, // String - Google API key for loading Google JS API & Maps API
		locationsElem:      null, // String - This is the container element for your address list(s) (e.g. #locations)
		geodataElem:        '#geodata', // String - Element for displaying visitor's current location. This element should be unique for each instance.
		recheckElem:        '#recheck', // String - Element for enabling re-checking of distances. this element should be unique for each instance.
		checkElem:          '#check', // String - Element to use to check distances if "manualCheck" is enabled. This element should be unique for each instance.
		notificationElem:   '.notification', // String - Notification element (e.g. "Getting geolocation...")
		distanceElem:       '.distance', // String - Element which shows the distance of each address
		geoAdrElem:         '.adr', // String - Microformats hcard .adr element that has address data inside it
		mapsLinkElem:       '.maps-link', // String - Class for Google Maps link element
		listParentElem:     'ul', // String - Container element for list items (e.g. ul, ol or div).
		listElem:           'li', // String - List item element (e.g. li or span)
		notificationStyle:  'show', // String - Notification display style. Options: 'fade', 'slide' or 'show'.
		distanceBigStr:     'miles', // String - Default string for distance is in miles, changes to kilometers if set to anything else
		distanceSmallStr:   'meters', // String - Default string for meters, change to your own language if needed
		distanceUnknownStr: 'unknown', // String - Default string for unknown distance, change to your own language if needed
		notFoundStr:        'Could not get your location', // String - Default string for own location not found
		mapsLinkStr:        'Show directions' // String - Default string for Google Maps link text
	};

	function GeoLocator(element, settings) {
		this.settings          = settings;
		this.el                = settings.locationsElem || element;
		this.addressArr        = []; // array for holding address lists
		this.$el               = $(this.el); // element that has all location data
		this.$recheckElem      = $(settings.recheckElem);
		this.$checkElem        = $(settings.checkElem);
		this.$notificationElem = $(settings.notificationElem);
		this.$geodataElem      = $(settings.geodataElem);

		this.prepare();

		return this;
	}

	GeoLocator.prototype = {

		constructor: GeoLocator,

		prepare: function() {
			var self = this,
			settings = self.settings,
			$checkElem = self.$checkElem;

			// reset and query the DOM

			self.$lists            = self.$el.children(settings.listParentElem); // re-select lists
			self.listLength        = self.$lists.children(settings.listElem).length; // re-select total length of list items
			self.ownLatLng         = null;
			self.tCount            = 0; // Geolocation timeout counter
			self.lCount            = 0; // List item counter
			this.html5Geo          = false;
			self.addressArr.length = 0; // make sure the address list array is empty

			// Bind a click handler if manual check is enabled
			// or initialize the plugin

			if ( settings.manualCheck && $checkElem.length ) {
				$checkElem.show().click(function(e) {
					e.preventDefault();
					self.init();
				});
			} else {
				self.init();
			}
		},

		init: function() {
			var self = this,
			google = window.google,
			$notificationElem = self.$notificationElem,
			$recheckElem = self.$recheckElem,
			notificationStyle = self.settings.notificationStyle;

			// Check if google is defined, if not, load google API

			if ( typeof google === 'undefined' || typeof google.load === 'undefined' || typeof google.maps === 'undefined' ) {
				// load google API and return
				self.loadGoogleAPI();
				return;
			} else {
				// google API is loaded
				self.google = google;
				self.googleMaps = google.maps;

				// Show notification element

				if ( $notificationElem.length && !$notificationElem.is(':visible') ) {
					if ( notificationStyle === 'fade' ) {
						$notificationElem.fadeIn(300);
					} else if ( notificationStyle === 'slide' ) {
						$notificationElem.slideDown(300);
					} else {
						$notificationElem.show();
					}
				}

				// Hide recheck element

				if ( $recheckElem.length && $recheckElem.is(':visible') ) {
					$recheckElem.unbind('click').hide();
				}

				// call getGeolocation
				self.getGeolocation();
			}

		},

		loadGoogleAPI: function() {
			var self = this,
			google = window.google;

			// if google is already there but maps isn't, load Google Maps API v3 and return
			if ( typeof google !== 'undefined' && typeof google.load !== 'undefined' && typeof google.maps === 'undefined' ) {
				google.load('maps', '3', { 'other_params': 'sensor=true', 'callback': function() {
					self.init();
				}});
				return;
			}

			// Load Google JS API
			$.getScript('http://www.google.com/jsapi?key=' + self.settings.apiKey)
			.done(function() {
				self.init();
			})
			.fail(function(jqxhr, settings, exception) {
				self.debug(exception, 1);
			});

		},

		getGeolocation: function() {
			var self = this,
			settings = self.settings,
			$geodataElem = self.$geodataElem,
			geolocation = window.navigator.geolocation,
			googleMaps = self.googleMaps,
			googleLoader = self.google.loader,
			googleClientLoc = googleLoader.ClientLocation,
			googleLatitude = null,
			googleLongitude = null,
			geoTimeout = null,
			ownLocation = null;

			if ( googleClientLoc != null ) {
				googleLatitude = googleClientLoc.latitude;
				googleLongitude = googleClientLoc.longitude;
			}

			// check that current timeout count is 0
			// timeout geolocation request, fallback on google.loader.ClientLocation
			if ( !self.tCount ) {

				geoTimeout = window.setTimeout(function() {
					self.tCount++;
					self.getGeolocation();
				}, 500);
			}

			// try to get HTML5 Geolocation - fallback on google.loader.ClientLocation
			if ( !self.tCount && geolocation ) {

				geolocation.getCurrentPosition(function(position) {
					var positionCoords = position.coords,
						HTML5Latitude = positionCoords.latitude,
						HTML5Longitude = positionCoords.longitude;

					if ( position && positionCoords != null ) {

						// successful with Geolocation coords so
						// make sure that everything else is canceled
						self.html5Geo = true;
						window.clearTimeout(geoTimeout);

						// visitor's current location lat & lng
						ownLocation = new googleMaps.LatLng(HTML5Latitude, HTML5Longitude);

						self.ownLatLng = HTML5Latitude + ', ' + HTML5Longitude;

						// update own location and lists with lat & lng from HTML5 Geolocation API
						self.updateOwnLocation(ownLocation);
						self.loopAddressLists(ownLocation);
						return;
					}

				}, function(error) {
					// Error handler for HTML5 Geolocation API
					self.geolocationError(error);
				}, {
					// Settings for HTML5 Geolocation API
					maximumAge: settings.maximumAge,
					timeout: settings.timeout,
					enableHighAccuracy: settings.enableHighAccuracy
				});

			} else if ( self.tCount < 2 && !self.html5Geo ) {

				// HTML5 Geolocation API did not respond fast enough, so make sure that
				// we have Google's IP address based location specified
				// and update own location and lists with Google's lat & lng
				if ( typeof self.google === 'object' && googleLoader != null && googleClientLoc != null ) {

					// visitor's current location lat & lng
					ownLocation = new googleMaps.LatLng(googleLatitude, googleLongitude);

					self.ownLatLng = googleLatitude + ', ' + googleLongitude;

					self.updateOwnLocation(ownLocation);
					self.loopAddressLists(ownLocation);
				}
			}

			if ( self.tCount > 0 && googleClientLoc == null && !self.html5Geo ) {

					// reset timer counter
					self.tCount = 0;

					// We could not get visitor's location from Google, so make sure
					// that we reset settings and notify the visitor about it
					self.resetElements();

					if ( settings.debugMode ) {
						self.debug('== Google API warning ==\nmessage: '+ settings.notFoundStr, 2);
					}

					if ( $geodataElem.length ) {
						$geodataElem.text(settings.notFoundStr);
					}

					// trigger a "fail" custom event
					self.$el.trigger('geolocator:fail');
			}

		},

		updateOwnLocation: function(ownLocation)	{
			var self = this,
			settings = self.settings,
			$geodataElem = self.$geodataElem,
			googleMaps = self.googleMaps,
			googleMapsGeocoder = new googleMaps.Geocoder();

			// Use Google Maps geocoder to get visitors own location
			googleMapsGeocoder.geocode({ latLng: ownLocation }, function(responses, status) {
				var debugMsg = '';

				// Check for returned status code
				// http://code.google.com/intl/en-US/apis/maps/documentation/geocoding/#StatusCodes

				if ( status === 'OK' ) {

					if ( $geodataElem.length ) {
						$geodataElem.text(responses[0].formatted_address);
					}

					// trigger a "done" custom event
					self.$el.trigger('geolocator:own-done');

				} else {

					// trigger a "fail" custom event
					self.$el.trigger('geolocator:own-fail');

					if ( settings.debugMode ) {

						// Status was not ok, so it's most likely an error
						if ( status === 'OVER_QUERY_LIMIT' ) {
							debugMsg = 'You are over your quota.';
						} else if ( status === 'ZERO_RESULTS' ) {
							debugMsg = 'Geocode was successful but returned no results.';
						} else if ( status === 'REQUEST_DENIED' ) {
							debugMsg = 'Your request was denied.';
						} else if ( status === 'INVALID_REQUEST' ) {
							debugMsg = 'The query (address or latlng) is missing.';
						}

						self.debug('== Google Geocoding API error ==\nmessage: ' + debugMsg, 1);
					}
				}
 
			});
		},

		loopAddressLists: function(ownLocation) {
			var self = this,
			googleMaps = self.googleMaps,
			numOfTotalListItems = self.listLength,
			googleMapsDirections = new googleMaps.DirectionsService();

			// Loop each list element that is inside the main container element

			$.each(self.$lists, function(i, el) {
				self.getDistances(i, el, numOfTotalListItems, googleMaps, googleMapsDirections, ownLocation);
			});

		},

		getDistances: function(i, el, numOfTotalListItems, googleMaps, googleMapsDirections, ownLocation) {
			var self = this,
			settings = self.settings,
			addressArr = self.addressArr;

			// clone our current list element's list items into a new object with address related information
			addressArr[i] = $(el).children(settings.listElem).clone(true).map(function(i, el) {
			var	$el = $(el), // current single list item element
				$adr = $el.find(settings.geoAdrElem),
				dataLat = null,
				dataLng = null,
				latLng = (dataLat = $adr.data('latitude')) && (dataLng = $adr.data('longitude')) ? new googleMaps.LatLng(dataLat, dataLng) : null;
					
				return {
					'addresstxt': $.text($adr.find('.street-address')) + ', ' + $.text($adr.find('.postal-code')) + ', ' + $.text($adr.find('.locality')) + ' ' + $.text($adr.find('.region')),
					'latLng': latLng,
					'element': $el,
					'distance': null,
					'endloc': null
				};
			});

			// after we have the new objects, loop each to query for a location
			$.each(addressArr[i], function(i, address) {
				var destination = address.latLng || address.addresstxt;
				googleMapsDirections.route({
					'origin': ownLocation,
					'destination': destination,
					'travelMode': googleMaps.DirectionsTravelMode.DRIVING
				}, function(result, status) {

					if ( status === 'OK' ) {
						var resultRoute = result.routes[0].legs[0],
						resultRouteEnd = resultRoute.end_location,
						routeStr = '',
						i = 0;

						for (var prop in resultRouteEnd) {
							if ( resultRouteEnd.hasOwnProperty(prop) ) {
								routeStr += resultRouteEnd[prop];
								if ( !i ) {
									routeStr += ', ';
								}
								i++;
							}
						}

						address.distance = resultRoute.distance.value;
						address.endloc = routeStr;
					} else {
						address.distance = settings.distanceUnknownStr;
						address.endloc = null;
					}

					// add one to our looped address count
					self.lCount++;

					// if we have looped all list items
					if ( self.lCount === numOfTotalListItems ) {
						self.finishLocating();
					}
				});
			});

		},

		finishLocating: function() {
			var self = this,
			addressArr = self.addressArr,
			i = addressArr.length;

			// reset total address count
			self.lCount = 0;

			// loop address array and update each address list
			while (i--) {
				self.updateAddresslist(i);
			}

			// all addresses have been looped and updated,
			// so empty the address array
			addressArr.length = 0;

			// finally reset elements
			self.resetElements();

			// trigger a "done" custom event
			self.$el.trigger('geolocator:done');

		},

		updateAddresslist: function(i) {
			var self = this,
			settings = self.settings,
			listElem = settings.listElem,
			clientLoc = self.google.loader.ClientLocation,
			addressArr = self.addressArr,
			len = addressArr[i].length,
			addressesStr = '',
			j = 0,
			ownLoc = null,
			mapsHref = null,
			address = null,
			$el = null,
			$mapsLinkElem = null;

			// Sort by shortest distance if sorting is enabled
			// ...and if there are more than 1 address inside the current jQuery object
			if ( settings.sorting && len > 1 ) {
				addressArr[i].sort(function(a, b) {
					return a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0;
				});
			}

			// Own latitude and longitude for google maps link, fallback on google.loader.ClientLocation latitude and longitude
			ownLoc = self.ownLatLng || clientLoc.latitude + ', ' + clientLoc.longitude;

			// 1. Loop all addresses inside the current jQuery object
			// 2. Check if we have end_location
			// 3. Add a map link if we have latitude and longitude of the address
			// 4. Format the distance of each address
			// 5. Add the address element's HTML to a string

			for ( ; j < len; j++ ) { // 1
				address = addressArr[i][j];
				$el = address.element;
				$mapsLinkElem = $el.find(settings.mapsLinkElem);

				if ( address.endloc ) { // 2
					mapsHref = 'http://maps.google.com/maps?saddr=' + ownLoc + '&daddr=' + address.endloc;

					if ( !$mapsLinkElem.length ) { // 3
						$el.append('<a href="' + mapsHref + '" class="' + settings.mapsLinkElem.substring(1) +  '">' + settings.mapsLinkStr + '</a>');
					} else {
						$mapsLinkElem.attr('href', mapsHref);
					}
				}

				$el.find(settings.distanceElem).text(self.formatDistance(address.distance)); // 4
				addressesStr += $el.outerHTML(); // 5
			}

			// replace the old HTML inside the current list
			// with a HTML string that contains all fetched distances
			self.$lists.eq(i).html(addressesStr);
		},

		formatDistance: function(distance) {
			var metersToMile = 1609.344,
			settings = this.settings,
			bigStr = ' ' + settings.distanceBigStr,
			miles = ' miles';

			// 1. Check if distance setting is 'miles'
			// 2. If it isn't 'miles' then it is kilometers
			// 3. Show short distances in meters
			if ( distance > (metersToMile / 10) && bigStr === miles ) { // 1
				distance = (Math.round((distance / metersToMile) * 10 ) / 10) + bigStr;
			} else if ( distance > 100 && bigStr !== miles ) { // 2
				distance = (distance * 0.001).toFixed(1) + bigStr;
			} else { // 3
				distance = (parseFloat(distance) === distance) ? distance + ' ' + settings.distanceSmallStr : settings.distanceUnknownStr;
			}

			return distance;
		},

		resetElements: function() {
			var self = this,
			settings = self.settings,
			$notificationElem = self.$notificationElem,
			$recheckElem = self.$recheckElem,
			$checkElem = self.$checkElem,
			notificationStyle = settings.notificationStyle;

			// Hide notification with a style defined in settings
			if ( $notificationElem.length && $notificationElem.is(':visible') ) {
				if ( notificationStyle === 'fade' ) {
					$notificationElem.fadeOut(300);
				} else if ( notificationStyle === 'slide' ) {
					$notificationElem.slideUp(300);
				} else {
					$notificationElem.hide();
				}
			}

			// setup recheck element
			if ( $recheckElem.length && !$recheckElem.is(':visible') ) {

				if ( $checkElem.length && $checkElem.is(':visible') ) {
					$checkElem.unbind('click').hide();
				}

				self.$recheckElem.show().click(function(e) {
					e.preventDefault();
					$(this).unbind('click').hide();
					self.prepare();
				});

			}

		},

		geolocationError: function(error) {
			var self = this;

			// Log errors only if debugging is enabled
			if ( self.settings.debugMode ) {
				self.debug('== HTML5 Geolocation API warning ==\nmessage: ' + error.message + '\ncode: ' + error.code, 2);
			}
		},

		debug: function(message, type) {
			var console = window.console;

			// Log debug messages if window.console is supported by the browser
			// debug types:
			// 1 = error
			// 2 = warning
			if ( console ) {

				if ( console.error && type === 1 ) {
					console.error(message);
				} else if ( console.warn && type === 2 ) {
					console.warn(message);
				} else if ( console.log ) {
					console.log(message);
				}

			}

		}

	};

	$.fn.geolocator = function(options) {

		if ( !this.length ) {
			return this;
		}

		return this.each(function() {
			var plugin = $.data(this, pluginName);
			if ( !plugin ) {
				options = $.extend({}, defaultSettings, options);
				$.data(this, pluginName, new GeoLocator(this, options));
			} else {
				plugin.prepare();
			}
 
		});
	};

	// outerHTML plugin - https://gist.github.com/889005
	$.fn.outerHTML = function() {

		// IE, Chrome & Safari will comply with the non-standard outerHTML, all others (FF) will have a fall-back for cloning
		return ( !this.length ) ? this : (this[0].outerHTML || (function(el) {
			var div = document.createElement('div'), contents;
			div.appendChild(el.cloneNode(true));
			contents = div.innerHTML;
			div = null;
			return contents;
		})(this[0]));

	};

}(window.jQuery, window, window.document));