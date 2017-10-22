angular.module('gpsAssist', [])

/**
 * Service providing playback and mpd queue functionality 
 */
.factory('gpsAssist', function($http, $log, $rootScope, $interval) {
	// Frequency to refresh the speed limit data in seconds
	var speedLimitRefresh = 300;

	/**
	* Get data from the Gpsd service
	*
	* @return object 
	*/
	function getLocationData() {
		var getGps = getGpsData('/php/services.php?action=get-location');
		var appSettings = JSON.parse(window.localStorage['app_settings']);

		var gpsData = getGps.then(function(resultSet) {

				if (typeof resultSet.data.tpv ==='undefined' || resultSet.data.tpv.length === 0) {
					var gpsStatus = {
						'status' : 'No Fix',
						'latitude' : '-',
						'longitude' : '-',
						'altitude' : '-',
						'heading' : '-',																		
						'speed' : '0',
						'speed_limit' : 'Unknown',
						'speed_limit_age' : 0,
						'time' : 'Unknown'
					}							
					
				} else {
					var resultSet = resultSet.data.tpv[0];

					var speedLimitData = window.localStorage['speed_limit'];

					var currentTime = Date.now();

					if (appSettings.speed_limit === 1) {
						if (!speedLimitData) {

							speedLimit(resultSet.lat, resultSet.lon);

							var limitData = {
								'speed_limit' : 'Unknown',
								'age' : ''
							}
						} else {
							var speedLimitData = JSON.parse(speedLimitData);

							if ((currentTime - speedLimitData.age) / 1000 > speedLimitRefresh) {
								speedLimit(resultSet.lat, resultSet.lon);

								var limitData = {
									'speed_limit' : 'Unknown',
									'age' : ''
								}
							} else {
								var limitAge = Math.round((currentTime - speedLimitData.age) / 1000);

								if ( limitAge > 3600 ) {

									var limitData = {
										'speed_limit' : 'Unknown',
										'age' : 'Limited connectivity available'
									}	

								} else {

									var limitData = {
										'speed_limit' : speedLimitData.speed_limit,
										'age' : 'Checked '  + limitAge +  ' seconds ago'
									}	

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

							if ( typeof appSettings.speed !=="undefined" && appSettings.speed === 1) {
								var estSpeedLimit = limitData.speed_limit + ' mph';					
							} else {
								var estSpeedLimit = limitData.speed_limit + ' km/h';
							}
						}											
					}

					if ( typeof resultSet.alt === 'undefined' ) {
						var gpsAltitude = '-';
					} else {
						var gpsAltitude = resultSet.alt;
					}

					if ( typeof resultSet.track === 'undefined' ) {
						var gpsHeading = '-';
					} else {
						var gpsHeading = Math.round(resultSet.track) + ' degrees - ' + convertBearing(resultSet.track);
					}
					
					if (!limitData) {
					  var limitData = {
						age : ''
					  };
					}

					if (typeof resultSet.lat === undefined) {
						var gpsStatus = '';						
					} else {
						var gpsStatus = 'Has Fix';							
					}

                    if (!resultSet.lat) {
						var gpsStatus = 'No Fix';
						resultSet.lat = '-';
						resultSet.lon = '-';						                                               
                    } else {
						var gpsStatus = 'Has Fix';
                    }


                    var gpsStatus = {
                            'status' : gpsStatus,
                            'latitude' : resultSet.lat,
                            'longitude' : resultSet.lon,
                            'altitude' : gpsAltitude,
                            'heading' : gpsHeading,
                            'speed' : speedConversion(resultSet.speed),
                            'speed_limit' : estSpeedLimit,
                            'speed_limit_age' : limitData.age,
                            'time' : resultSet.time
                    }

					if (appSettings.speed_limit === 1) {
						gpsStatus.speed_limit = estSpeedLimit;
						gpsStatus.speed_limit_age = limitData.age;
						gpsStatus.speed_warn = speedWarn;						
					} else {
						gpsStatus.speed_warn = 0;
					}
				}

				return gpsStatus
			});

		return gpsData;
	}
	
	/**
	* Maintain a local storage object containing information about a trip
	*
	* @param object gpsData
	* @param integer checkFrequency
	**/
	function updateTrip( gpsData, checkFrequency )
	{
		// Frequency to store a trip data point in seconds
		var dataResolution = 60;

		var tripData = window.localStorage['trip_data'];
		var dataPoints = [];

		if (typeof gpsData.speed === "number" && gpsData.speed < 5) {
			gpsData.speed = 0;
		}

		var gpsAltitude = gpsData.altitude;

		if (tripData) {
			var tripData = JSON.parse( tripData );

			dataPoints = tripData.data_points;

			if ((typeof dataPoints !== "undefined" ) && 
				(typeof dataPoints[dataPoints.length - 1] !=='undefined') && 
				(gpsData.longitude != dataPoints[dataPoints.length - 1].long) && 
				(gpsData.latitude != dataPoints[dataPoints.length - 1].lat)) {
				
				var distanceTravelled = (
											haversineDistance(
																{ 
																	'long': dataPoints[dataPoints.length - 1].long, 
																	'lat': dataPoints[dataPoints.length - 1].lat 
																}, 
																{
																	'long': gpsData.longitude, 
																	'lat': gpsData.latitude 
																}
															)
										);
			} else {
				var distanceTravelled = 0;
			}

            var tripTime = parseInt(tripData.time) + parseInt(checkFrequency);
      
		} else {
			var tripTime = 0;
		}

		/*
		* If we have passed the time resolution value has been passed, store another data point about the trip
		*/
		if ((typeof dataPoints[0] === "undefined" ) || (typeof dataPoints !== "undefined" ) && (typeof dataPoints[dataPoints.length-1]!=='undefined') && ((Date.now() - dataPoints[dataPoints.length-1].timestamp) / 1000 > dataResolution)) {

			dataPoints.push({
								'lat' : gpsData.latitude,
								'long' : gpsData.longitude,
								'timestamp' : Date.now(),
								'speed' : gpsData.speed,
								'altitude' : gpsAltitude,
								'distance' : distanceTravelled
							});
		}

		if ( typeof tripData === "undefined" ) {

			var totalDistance = 0;

		} else {

			var totalDistance = tripData.distance + distanceTravelled;

		}

		var tripDetails = {
			'distance' : totalDistance,
			'time' : tripTime,         		
			'data_points' : dataPoints
		}		

		window.localStorage['trip_data'] = JSON.stringify( tripDetails );
	}


	/**
	* Haversine formulae for calculating the distance between two points
	*
	* @param object coords1
	* @param object coords2
	*/ 
	function haversineDistance(coords1, coords2) {
	  function toRad(x) {
	    return x * Math.PI / 180;
	  }

	  var lon1 = coords1.long;
	  var lat1 = coords1.lat;

	  var lon2 = coords2.long;
	  var lat2 = coords2.lat;

	  var R = 6371; // Radius of the earth in km

	  var x1 = lat2 - lat1;
	  var dLat = toRad(x1);

	  var x2 = lon2 - lon1;
	  var dLon = toRad(x2)
	  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	  var d = R * c;

	  return d;
	}	

	/**
	* Calculate the optimum zoom level for a map
	*
	* @param float mapLatitude
	* @param float distanceTravelled
	*
	* @return integer mapZoom
	*/
	function getMapZoom( mapLatitude, distanceTravelled ) {

    	var latAdjustment = Math.cos( Math.PI * mapLatitude / 180.0 );
    	var latArg = 6378140 * 464 * latAdjustment / ( ( distanceTravelled * 1000 ) * 256.0 );

    	var zoomLevel = Math.floor( Math.log( latArg ) / Math.log( 2.0 ) );

		return zoomLevel;

	}

	/**
	* Get the speed limit for an area
	*
	* @param float latitude
	* @param float longitude
	*/
	function speedLimit(latitude, longitude) {

		var getGps = getGpsData('/php/services.php?action=speed-limit&latitude=' + latitude + '&longitude=' + longitude);

		getGps.then(function(resultSet) {
			if (resultSet.data) {
				var speedData = {
					'speed_limit' : resultSet.data,
					'age' : Date.now()
				}
				window.localStorage['speed_limit'] = JSON.stringify(speedData);
			} else {
				var speedData = {
					'speed_limit' : 'Unknown',
					'age' : Date.now()
				}
				window.localStorage['speed_limit'] = JSON.stringify(speedData);				
			}
		});
	}

	/**
	* Get information about the current location
	*
	* @param float latitude
	* @param float longitude
	*/
	function locationInfo(latitude, longitude) {
		var locationInfo = window.localStorage['location_info'];

		if ((typeof locationInfo ==="undefined") || ((Date.now() - locationInfo.age) > 600)) {
			var getGps = getGpsData('/php/services.php?action=location-info&latitude=' + latitude + '&longitude=' + longitude);

			return getGps.then(function(resultSet) {
				if (resultSet.data) {

					var locationInfo = {
						'location_info' : resultSet.data,
						'age' : Date.now()
					}
					window.localStorage['location_info'] = JSON.stringify(locationInfo);
				}
			});
		} else {
			return JSON.parse( locationInfo );
		}
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
	*
	* @return string headingDir
	*/
	function convertBearing(headingDegrees)
	{
	  if (headingDegrees > 349) {
	    var headingDir = "North";
	  }

	  if (headingDegrees <= 11) {
	    var headingDir = "North";
	  }

	  if ((headingDegrees > 11) && ((headingDegrees <= 34 ))) {
	    var headingDir = "NNE";
	  }

	  if ((headingDegrees > 34) && ((headingDegrees <= 56 ))) {
	    var headingDir = "NE";
	  }

	  if ((headingDegrees > 56) && ((headingDegrees <= 79 ))) {
	    var headingDir = "ENE";
	  }

	  if ((headingDegrees > 79) && ((headingDegrees <= 101 ))) {
	    var headingDir = "East";
	  }

	  if ((headingDegrees > 101) && ((headingDegrees <= 124 ))) {
	    var headingDir = "ESE";
	  }                

	  if ((headingDegrees > 125) && ((headingDegrees <= 146 ))) {
	    var headingDir = "SE";
	  }    

	  if ((headingDegrees > 146) && ((headingDegrees <= 169 ))) {
	    var headingDir = "SSE";
	  }  

	  if ((headingDegrees > 169) && ((headingDegrees <= 191 ))) {
	    var headingDir = "South";
	  }  

	  if ((headingDegrees > 191) && ((headingDegrees <= 214 ))) {
	    var headingDir = "SSW";
	  }    

	  if ((headingDegrees > 214) && ((headingDegrees <= 236 ))) {
	    var headingDir = "SW";
	  }  

	  if ((headingDegrees > 236) && ((headingDegrees <= 259 ))) {
	    var headingDir = "WSW";
	  }

	  if ((headingDegrees > 259) && ((headingDegrees <= 281 ))) {
	    var headingDir = "West";
	  }                  

	  if ((headingDegrees > 281) && ((headingDegrees <= 304 ))) {
	    var headingDir = "WNW";
	  }    

	  if ((headingDegrees > 304) && ((headingDegrees <= 326 ))) {
	    var headingDir = "NW";
	  }                  

	  if ((headingDegrees > 326) && ((headingDegrees <= 349 ))) {
	    var headingDir = "NNW";
	  }  

	  return headingDir;  
	}	

	/**
	* Convert GPSD speeds from m/s to km/h
	*
	* @param gpsSpeed
	*
	* @return integer carSpeed
	*/
	function speedConversion( gpsSpeed )
	{
		if (isNaN(gpsSpeed)) {
			return 0;
		} else {
			var carSpeed = gpsSpeed / 1000 * 3600;

			return Math.ceil(carSpeed);
		}
	}

	return {
		speedConversion: function() {

			return speedConversion();

		},

		getMapZoom: function( mapLatitude, distanceTravelled ) {

			return getMapZoom( mapLatitude, distanceTravelled );

		},

		locationInfo: function( carLat, carLong ) {

			return locationInfo( carLat, carLong );

		},

		updateTrip: function( gpsData, checkFrequency ) {

			return updateTrip( gpsData, checkFrequency );

		},

		getLocationData: function() {

			return getLocationData();

		}

	}
});
