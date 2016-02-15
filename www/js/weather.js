angular.module('weatherAssist', [])

/**
 * Service providing playback and mpd queue functionality 
 */
.factory('weatherAssist', function($http, $log, $rootScope, $interval) {
	
	/**
	* Get the weather forecast for an area
	*
	* @param integer latitude
	* @param integer longitude
	*/
	function getForecast(latitude, longitude) {
		var weatherData = window.localStorage['weather_forecast'];

		if (weatherData) {
			var weatherData = JSON.parse(weatherData);
		}

		// Cache weather data for an hour
		if (!weatherData || ( (Date.now() - weatherData.age) > 3600) ) {
			var weatherRequest = getWeatherCall('http://localhost:8000/php/services.php?action=weather-forecast&location=' + latitude + ',' + longitude);

			weatherRequest.then(function(resultSet) {
				if (typeof resultSet.data.forecasts != undefined) {

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
				}

				return weatherForecast;
			});
		} else {
			return weatherData;
		}
	}

	/*
	* Parse 
	*
	* @param string dataEndpoint
	*/
	function getWeatherCall(dataEndpoint) {

	   	return $http({
	   	  	method: 'GET',
	   	  	url: dataEndpoint
	   	})	
	}

	/**
	* Getweather data from here.com
	*
	* @param string dataEndpoint
	*/
	function getWeatherData(dataEndpoint) {

	   	return $http({
	   	  	method: 'GET',
	   	  	url: dataEndpoint
	   	})	
	}

	return {
		getForecast: function(latitude, longitude) {
			return getForecast(latitude, longitude);
		}

	}
});