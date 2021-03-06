jQuery (Zepto) Geolocator
=================

## Features

jQuery Geolocator is a plugin that takes a list of addresses and gets a distance and directions to each address from your current geolocation position. If available, it uses [W3C Geolocation API (_HTML5 Geolocation_)](http://dev.w3.org/geo/api/spec-source.html) to find your current location, and queries Google Maps API for distances to each address inside your list. If the visitor's browser is old and does not support the Geolocation API, the more inaccurate IP address based geolocation from Google is used.

This plugin is a fork of / based on [HTML5-GeoLocation-jQuery-Plugin by teleject](http://teleject.github.com/HTML5-GeoLocation-jQuery-Plugin/).

### Why did I decide to make a new plugin instead of using the old one?

At first I only wanted to add some options to the original plugin, and fix variables that were leaking into the global scope. I soon realized that there were far more things that I wanted change inside the plugin, so I ended up rewriting many parts of the plugin code.

## Demo

[Click here for a demo](http://krister.fi/jquery.geolocator/#demo)

## Dependencies

To use the plugin the following scripts/libraries are required, and should be included on your page:

- [jQuery](http://jquery.com/) (_requires at least version 1.6_) or [Zepto](http://http://zeptojs.com/) (_needs a custom build like this `rake concat[-detect:-form:data:selector:fx_methods] dist` you can find the mentioned custom build inside the `dist` folder_)
- [Google JS API](https://developers.google.com/loader/#GettingStarted) + [API key](https://code.google.com/apis/console)
- [Google Maps API](https://developers.google.com/maps/documentation/javascript/reference)

## How to use

### 1. Markup

You need to wrap each address inside your list item with [Microformats hCard ADR defined classes](http://microformats.org/wiki/hcard-examples-rfc2426#3.2.1_ADR_Type_Definition), and somewhere inside the list item an element that has `distance` as its classname (that is where the distance for that address is printed). Classnames used in default markup can be changed via plugin options.

__Example markup:__

    <div id="locations">
    <ul>
      <li>
        <div class="adr">
          <span class="street-address">2907 E MLK Jr Blvd.</span>, 
          <span class="locality">Austin</span>, 
          <span class="region">TX</span>, 
          <span class="postal-code">78702</span>
        </div>
        <div class="distance"></div>
      </li>
      <li>
        <div class="adr">
          <span class="street-address">Aleksanterinkatu 52</span>
          <span class="postal-code">00100</span>, 
          <span class="locality">Helsinki</span> 
          <span class="country-name">Finland</span>
        </div>
        <div class="distance"></div>
      </li>
    </ul>
    </div>

If you want, you can optionally set latitude and longitude of the address as [data attributes](http://html5doctor.com/html5-custom-data-attributes/) to `.adr` elements, to get more accurate results:

    <div class="adr" data-latitude="##.######" data-longitude="##.######">
    ...
    </div>

You can also have multiple unordered list elements with different addresses inside your `locations` element. However, you should only have one instance of the plugin running, since running multiple instances of the plugin seems to be quite buggy.

### 2. Needed scripts

Before you use the plugin, make sure that you have jQuery (or Zepto), Google JS API, Google Maps and jQuery Geolocator plugin linked inside your `<head>` tag, or before your ending `</body>` tag (_recommended_).


    <script src="//www.google.com/jsapi?key=YOUR_GOOGLE_API_KEY"></script>
    <script src="//maps.googleapis.com/maps/api/js?sensor=true"></script>
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.0/jquery.min.js"></script>
    <script src="js/jquery.geolocator.js"></script>

### 3. Javascript

After you have all script tags included, you can call the plugin on a list (unordered list, ul - by default) with your custom options. (Remember to wrap your code in jQuery's or Zepto's [.ready() function](http://api.jquery.com/ready/))

Here we are changing the plugin to use kilometers instead of miles:

    <script>
    $(document).ready(function() {
    	$("#locations").geolocator({ distanceBigStr: 'km', distanceSmallStr: 'm' });
    });
    </script>

You can also use the plugin without manually including Google API script tags, but it is not recommended since it will slow down the time it takes to find geolocation/distances as it has to load the Google APIs after the plugin has been initialized. This can be done with the `apiKey` option:

    <script>
    $(document).ready(function() {
    	$("#locations").geolocator({ apiKey: 'YOUR_GOOGLE_API_KEY' });
    });
    </script>

If you later need to refresh the plugin, you can call it again on the same element without any options:

    $("#locations").geolocator();

## Info about Zepto support

Default build of Zepto.js does not provide all the methods that are needed, so you need to build a custom version of Zepto.

This is the custom build of Zepto that you can find inside the `dist` folder:

```
rake concat[-detect:-form:data:selector:fx_methods] dist
```

## Plugin options: General settings

Following options can be used to customize the plugin:

__sorting__

Set to `false` if you don't want addresses to be sorted by distance automatically. Default: `true`.

__manualCheck__

Set to `true` if you want to disable automatic geolocating, and let the user manually geolocate using a link. Default: `false`.

Example:

    <a href="#" id="check">Check geolocation</a>

__notificationStyle__

A notification style for your `'getting geolocation...'` text. `'fade'` or `'show'`. Default: `'show'`.

__apiKey__

An Google API key is needed if you want the plugin to download all Google APIs for you. Default: `null`.

__targetBlank__

Set to `true` to open all `'Show directions'` links in a new browser tab/window. Default: `false`.

__debugMode__

Set to `true` to enable debug mode. This mode logs all Geolocation and Google API errors to you browser's Javascript console. Default: `false`.

## Plugin options: Elements

__checkElem__

Element selector (a link element) for `manualCheck` setting. Default: `'#check'`.

__recheckElem__

Element selector (a link element) to recheck geolocation. Default: `'#recheck'`.

__geodataElem__

Element that displays your own location. Default: `'#geodata'`.

__notificationElem__

Element that displays a `'getting geolocation...'` notification when the plugin is running. Default: `'.notification'`.

__listParentElem__

Parent element for a list (_usually ul or ol_). Default: `'ul'`.

__listElem__

Child element for list items. Default: `'li'`.

__distanceElem__

Element that displays the distance for each address. Has to be a child of `listElem` element. Default: `'.distance'`.

__geoAdrElem__

Element that holds each address. Has to be a child of `listElem` element. [Microformats hCard ADR defined classes](http://microformats.org/wiki/hcard-examples-rfc2426#3.2.1_ADR_Type_Definition). Default: `'.adr'`.

__mapsLinkElem__

Element that is appended to each list item. Has to be a child of `listElem` element. Default: `'.maps-link'`.

__locationsElem__

With this setting you can assign your main element like this `$.geolocator({ locationsElem: '#locations' });`. Default: `null`.

## Plugin options: Language strings

You can change the default texts used by the plugin to your own language.

__distanceBigStr__

Language string for big distance (miles or kilometers). If default string `miles` is changed, kilometers will be used. Default: `'miles'`.

__distanceSmallStr__

Language string for small distance (meters). Default: `'meters'`.

__distanceUnknownStr__

Language string for unknown distance. Default: `'unknown'`.

__notFoundStr__

Language string that is displayed when your location is not found. Default: `'Could not get your location'`.

__mapsLinkStr__

Language string for a Google Maps link that is showed next to each address. Default: `'Show directions'`.

## Plugin options: W3C Geolocation API options

__enableHighAccuracy__

Set to `true` if you want to get the most accurate location estimate possible. Getting geolocation might take longer if enabled. Default: `false`.

__timeout__

The number of milliseconds to wait before timing out. Default: `6000` (6 seconds). 

__maximumAge__

Amount of time in milliseconds that the geolocation result is cached. Default: `60000` (1 minute).

## Custom events

The following events are triggered on the element that is running jQuery Geolocator:

* `'geolocator:fail'` when getting geolocation (_Geolocation API or Google_) fails.
* `'geolocator:done'` when the script has finished running, and getting geolocation was successful.
* `'geolocator:own-fail'` when getting your own location failed.
* `'geolocator:own-done'` when getting your own location was successful.

You can listen to the events by using for example jQuery's `.on()` (or `.bind()`):

    $("#locations").on("geolocator:done", function(){
      // do something
    });

## Browser support

The script uses Geolocation API in newer browsers. A fallback to a IP address based geolocation from Google is used in older browsers. It should work in Internet Explorer 7+, Firefox, Safari, Chrome and Opera. Even though the browser support is quite good, the performance might not be that good in older desktop and mobile browsers.

## Reporting issues and bugs

If something is not working for you or you find a bug, please open a new issue at the [issues section](https://github.com/kristerkari/jQuery-Geolocator/issues).

## Developer

Developed by [Krister Kari](https://twitter.com/#!/kristerkari).

## License

This software is released under the [MIT license](http://www.opensource.org/licenses/MIT)

## Changelog

* 1.0.4 (_19.08.2012_) - Added support for Zepto.js
* 1.0.3 (_19.08.2012_) - Added a workaround for Google API limitations and added [Grunt](https://github.com/cowboy/grunt) as a build tool
* 1.0.2 (_01.05.2012_) - added clearTimeout to fix a bug in older browsers, and did a small change to link creation 
* 1.0.1 (_27.04.2012_) - 'targetBlank' option for links, support for country names (_.country-name_) and small fixes to loops.
* 1.0.0 (_20.04.2012_) - Initial release