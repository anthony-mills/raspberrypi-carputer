angular.module('weatherAssist', [])

/**
 * Service providing weather retrival functionality 
 */
.factory('weatherAssist', function($http, $log, $rootScope) {

	// Cache the weather forecast for at least an hour
	var weatherCacheTTL = 360000;

	/**
	* Get the weather forecast for a given location
	*
	* @param integer latitude
	* @param integer longitude
	* 
	* @return object
	*/
	function getForecast(latitude, longitude) {
		var weatherData = window.localStorage['weather_forecast'];

		if (weatherData) {
			var weatherData = JSON.parse(weatherData);
		}

		// Cache the weather data for an hour
		if ( (typeof weatherData.created==='undefined') || ( Date.now() - weatherData.created > weatherCacheTTL ) ) {
			console.log(Date.now() - weatherData.created);
			window.localStorage['weather_forecast'] =  false;
			
			var weatherRequest = getWeatherCall('/php/services.php?action=weather-forecast&location=' + latitude + ',' + longitude);

			weatherRequest.then(function(resultSet) {

				// Check first for an error message
				if ( resultSet.data.Message != undefined ) {
					console.error('Weather API Error: ' + resultSet.data.Message);

					return;
				}

				if ( typeof resultSet.data.dailyForecasts.forecastLocation != undefined ) {

					var weatherForecast = {
										'location'	: {
											'state' : resultSet.data.dailyForecasts.forecastLocation.state,
											'city' : resultSet.data.dailyForecasts.forecastLocation.city,
											'latitude' : resultSet.data.dailyForecasts.forecastLocation.latitude,
											'longitude' : resultSet.data.dailyForecasts.forecastLocation.longitude																						
										},
										'forecast'	: resultSet.data.dailyForecasts.forecastLocation.forecast,
										'created'	: Date.now()
									}

					window.localStorage['weather_forecast'] = JSON.stringify( weatherForecast );		

					return weatherForecast;						
				}

			});
		} else {
			return weatherData;
		}
	}

	/**
	* Rewrite the here.com weather icon into the location of a local image 
	*
	* @param string iconUrl
	*
	* @return string weatherIcon
	*/
	function getWeatherIcon( iconUrl )
	{
		var iconFile = iconUrl.substring(iconUrl.lastIndexOf('/')+1);

		iconFile = parseInt(iconFile.slice(0, -4));
		var weatherIcon = 'sunny.png';

		if (iconFile === 1) {

			var weatherIcon = 'sunny.png';

		} else if ( iconFile > 1 && iconFile < 5 || iconFile === 9 || iconFile === 12 || iconFile === 17 || iconFile === 25 ) {
			
			var weatherIcon = 'clouds.png';

		} else if ( iconFile === 5 || iconFile === 10 || iconFile === 22 || iconFile === 26 ) {
			
			var weatherIcon = 'rain.png';			

		} else if ( iconFile === 6 || iconFile === 7 || iconFile === 11 || iconFile === 15 ) {
			
			var weatherIcon = 'stormy.png';

		} else if ( iconFile === 8 || iconFile === 13 ) {
			
			var weatherIcon = 'haze.png';

		} else if ( iconFile === 14 || iconFile === 21 || iconFile === 23 || iconFile === 24 ) {
			
			var weatherIcon = 'moon_clouds.png';

		} else if ( iconFile === 16 ) {
			
			var weatherIcon = 'clear_night.png';

		} else if ( iconFile === 18 || iconFile === 19 || iconFile === 20 || iconFile === 28 ) {
			
			var weatherIcon = 'snow.png';

		} else if ( iconFile === 27 ) {

			var weatherIcon = 'showers.png';

		} else if ( iconFile > 28 && iconFile < 33) {
			
			var weatherIcon = 'windy.png';

		} 

		return '/img/weather_icons/' +  weatherIcon;
	}

	/**
	* Getweather data from here.com
	*
	* @param string dataEndpoint
	*/
	function getWeatherCall(dataEndpoint) {

	   	return $http({
	   	  	method: 'GET',
	   	  	url: dataEndpoint
	   	})	
	}

	return {
		getForecast: function(latitude, longitude) {
			return getForecast(latitude, longitude);
		},

		getWeatherIcon: function(iconUrl) {
			return getWeatherIcon(iconUrl);
		}

	}
});