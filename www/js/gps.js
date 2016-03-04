angular.module('gpsAssist', [])

/**
 * Service providing playback and mpd queue functionality 
 */
.factory('gpsAssist', function($http, $log, $rootScope, $interval) {
	/**
	* Get data fromt the Gpsd service
	*/
	function startGPS() {
		var getGps = getGpsData('http://localhost:8000/php/gps.php?op=json');
		var gpsData = getGps.then(function(resultSet) {
				if (typeof resultSet.data.tpv ==='undefined' || typeof resultSet.data.tpv[0].lat ==='undefined' || typeof resultSet.data.tpv[0].lon ==='undefined') {
					var gpsStatus = {
						'status' : 'No Fix',
						'latitude' : 'Unknown',
						'longitude' : 'Unknown',
						'altitude' : 'N / A',
						'heading' : 'N / A',																		
						'speed' : '0',
						'speed_limit' : 'Unknown',
						'speed_limit_age' : 0
					}							
					
				} else {
					var resultSet = resultSet.data.tpv[0];

					var speedLimitData = window.localStorage['speed_limit'];
					var currentTime = Date.now();
					if (!speedLimitData) {

						speedLimit(resultSet.lat, resultSet.lon);

						var limitData = {
							'speed_limit' : 'Unknown',
							'age' : ''
						}
					} else {
						var speedLimitData = JSON.parse(speedLimitData);

						if ((currentTime - speedLimitData.age) / 1000 > 300) {
							speedLimit(resultSet.lat, resultSet.lon);

							var limitData = {
								'speed_limit' : 'Unknown',
								'age' : ''
							}
						} else {
							var limitData = {
								'speed_limit' : speedLimitData.speed_limit,
								'age' : 'Checked ' + Math.round((currentTime - speedLimitData.age) / 1000) + ' seconds ago'
							}	
						}					
					}

					if ((Number(parseFloat(limitData.speed_limit))==limitData.speed_limit) && (speedConversion(resultSet.speed) > limitData.speed_limit)) {
						var speedWarn = 1;
					} else {
						var speedWarn = 0;
					}
							
					if (limitData.speed_limit === 'Unknown') {
						var estSpeedLimit = limitData.speed_limit;
					} else {
						var estSpeedLimit = limitData.speed_limit + ' kmh';					
					}

					if ( typeof resultSet.alt === 'undefined' ) {
						var gpsAltitude = 'Unknown';
					} else {
						var gpsAltitude = resultSet.alt + 'm';
					}

					if ( typeof resultSet.track === 'undefined' ) {
						var gpsHeading = 'Unknown';
					} else {
						var gpsHeading = Math.round(resultSet.track) + ' degrees - ' + convertBearing(resultSet.track);
					}
										
					var gpsStatus = {
						'status' : 'Has Fix',
						'latitude' : resultSet.lat,
						'longitude' : resultSet.lon,
						'altitude' : gpsAltitude,
						'heading' : gpsHeading,																		
						'speed' : speedConversion(resultSet.speed),
						'speed_limit' : estSpeedLimit,
						'speed_limit_age' : limitData.age,
						'speed_warn' : speedWarn				
					}
				}

				return gpsStatus
			});

		return gpsData;
	}

	/**
	* Get the speed limit for an area
	*
	* @param integer latitude
	* @param integer longitude
	*/
	function speedLimit(latitude, longitude) {

		var getGps = getGpsData('http://localhost:8000/php/services.php?action=speed-limit&location=' + latitude + ',' + longitude);

		getGps.then(function(resultSet) {
			if (resultSet.data) {
				var speedData = {
					'speed_limit' : resultSet.data,
					'age' : Date.now()
				}
				window.localStorage['speed_limit'] = JSON.stringify(speedData);
			} else {
				var speedData = {
					'speed_limit' : 'Unkown',
					'age' : Date.now()
				}
				window.localStorage['speed_limit'] = JSON.stringify(speedData);				
			}
		});
	}

	/**
	* Get the current GPS data
	*
	* @param string dataEndpoint
	*/
	function getGpsData(dataEndpoint) {

	   	return $http({
	   	  	method: 'GET',
	   	  	url: dataEndpoint
	   	})	
	}

	/**
	* Convert a heading in degrees into a compass direction
	*
	* @param integer headingDegrees
	*/
	function convertBearing(headingDegrees)
	{
	  if (headingDegrees > 349) {
	    var headingDegrees = "North";
	  }

	  if (headingDegrees <= 11) {
	    var headingDegrees = "North";
	  }

	  if ((headingDegrees > 11) && ((headingDegrees <= 34 ))) {
	    var headingDegrees = "NNE";
	  }

	  if ((headingDegrees > 34) && ((headingDegrees <= 56 ))) {
	    var headingDegrees = "NE";
	  }

	  if ((headingDegrees > 56) && ((headingDegrees <= 79 ))) {
	    var headingDegrees = "ENE";
	  }

	  if ((headingDegrees > 79) && ((headingDegrees <= 101 ))) {
	    var headingDegrees = "East";
	  }

	  if ((headingDegrees > 101) && ((headingDegrees <= 124 ))) {
	    var headingDegrees = "ESE";
	  }                

	  if ((headingDegrees > 125) && ((headingDegrees <= 146 ))) {
	    var headingDegrees = "SE";
	  }    

	  if ((headingDegrees > 146) && ((headingDegrees <= 169 ))) {
	    var headingDegrees = "SSE";
	  }  

	  if ((headingDegrees > 169) && ((headingDegrees <= 191 ))) {
	    var headingDegrees = "South";
	  }  

	  if ((headingDegrees > 191) && ((headingDegrees <= 214 ))) {
	    var headingDegrees = "SSW";
	  }    

	  if ((headingDegrees > 214) && ((headingDegrees <= 236 ))) {
	    var headingDegrees = "SW";
	  }  

	  if ((headingDegrees > 236) && ((headingDegrees <= 259 ))) {
	    var headingDegrees = "WSW";
	  }

	  if ((headingDegrees > 259) && ((headingDegrees <= 281 ))) {
	    var headingDegrees = "West";
	  }                  

	  if ((headingDegrees > 281) && ((headingDegrees <= 304 ))) {
	    var headingDegrees = "WNW";
	  }    

	  if ((headingDegrees > 304) && ((headingDegrees <= 326 ))) {
	    var headingDegrees = "NW";
	  }                  

	  if ((headingDegrees > 326) && ((headingDegrees <= 349 ))) {
	    var headingDegrees = "NNW";
	  }  

	  return headingDegrees;  
	}	

	/**
	* Convert GPSD speeds from m/s to km/h
	*
	* @param gpsSpeed
	*/
	function speedConversion( gpsSpeed )
	{
		var carSpeed = gpsSpeed / 1000 * 3600;

		return Math.floor(carSpeed);
	}

	return {
		speedConversion: function() {
			return speedConversion();
		},

		startGPS: function() {
			return startGPS();
		}

	}
});