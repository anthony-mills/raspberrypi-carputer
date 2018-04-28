angular.module('weatherAssist', [])

/**
 * Service providing weather retrival functionality 
 */
.factory('weatherAssist', function($http, $log, $rootScope) {

	// Length of time to cache the weather result for in seconds
	var weatherCacheTTL = 3600;

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
		if ( (typeof weatherData === "undefined") ||  (typeof weatherData.created === "undefined") || ( Date.now() - weatherData.created > (weatherCacheTTL * 1000) ) ) {
			window.localStorage['weather_forecast'] =  false;
			
			var weatherRequest = getWeatherCall('/php/services.php?action=weather-forecast&location=' + latitude + ',' + longitude);

			weatherRequest.then(function(resultSet) {
				console.log(resultSet);

				// Check first for an error message
				if ( resultSet.data.Message != undefined ) {
					console.error('Weather API Error: ' + resultSet.data.Message);

					return;
				}



				if ( typeof resultSet.data.title!= undefined ) {

					var weatherForecast = {
										'location'	: {
											'city' : resultSet.data.title,
											'latitude' : latitude,
											'longitude' : longitude																						
										},
										'forecast'	: resultSet.data.consolidated_weather,
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
	* Rewrite metaweather.com weather states into the location of a local image 
	* See https://www.metaweather.com/api/ for more information on possible weather states 
	*
	* @param string weatherType
	*
	* @return string weatherIcon
	*/
	function getWeatherIcon( weatherType )
	{
		var weatherIcon = 'sunny.png';

		switch (weatherType) {
			case 'c':
				var weatherIcon = 'sunny.png';				
			break;

			case 'lc':
				var weatherIcon = 'sunny.png';				
			break;

			case 'hc':
				var weatherIcon = 'clouds.png';				
			break;

			case 'hr':
				var weatherIcon = 'rain.png';				
			break;

			case 'lr':
				var weatherIcon = 'rain.png';				
			break;

			case 's':
				var weatherIcon = 'showers.png';				
			break;	

			case 't':
				var weatherIcon = 'stormy.png';				
			break;

			case 'sn':
				var weatherIcon = 'snow.png';				
			break;		

			case 'h':
				var weatherIcon = 'stormy.png';				
			break;

			case 'sl':
				var weatherIcon = 'snow.png';				
			break;															
		}

		return '/img/weather_icons/' +  weatherIcon;
	}

	/**
	* Reverse the date format
	*
	* @param dateString
	*/
	function reverseDate( dateString ) {
		var weekDays = [
							"Sunday",
							"Monday",
							"Tuesday",
							"Wednesday",
							"Thursday",
							"Friday",
							"Saturday"
						];
		
		var dateString = new Date( dateString );

		var dayNum = dateString.getDay();

		return weekDays[ dayNum ];
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
		getForecast: function( latitude, longitude ) {
			return getForecast( latitude, longitude );
		},

		reverseDate: function( dateString ) {
			return reverseDate( dateString );
		},

		getWeatherIcon: function( weatherType ) {
			return getWeatherIcon( weatherType );
		}

	}
});