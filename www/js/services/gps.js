angular.module('gpsAssist', [])

/**
 * Service providing playback and mpd queue functionality 
 */
.factory('gpsAssist', function($http, $log, $rootScope, $interval) {
	
	/**
	* Get data from the Gpsd service
	*
	* @return object 
	*/
	function getLocationData() {
		var getGps = getGpsData('/php/services.php?action=get-location');
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
						var estSpeedLimit = limitData.speed_limit + ' km/h';					
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
	* Maintain a local storage object containing information about a trip
	*
	* @param object gpsData
	* @param integer checkFrequency
	**/
	function updateTrip( gpsData, checkFrequency )
	{
		// Frequency to store a trip data point in seconds
		var dataResolution = 30;

		var tripData = window.localStorage['trip_data'];
		var dataPoints = [];
		var gpsAltitude = gpsData.altitude.replace("m", "");

		if (tripData) {
			var tripData = JSON.parse( tripData );

			dataPoints = tripData.data_points;

			if ((typeof dataPoints !== "undefined" ) && (typeof dataPoints[dataPoints.length - 1] !=='undefined') && (gpsData.longitude != dataPoints[dataPoints.length - 1].long) && (gpsData.latitude != dataPoints[dataPoints.length - 1].lat)) {
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

            if ((!isNaN(gpsData.speed)) && (parseInt(gpsData.speed) > parseInt(tripData.top_speed))) {

            	/**
            	* If the speed is under 80km/h assume its correct as a top speed any higher check it isn't anymore than 30km/h
            	* faster than the last stored datapoint.
            	* This needs some real life on road testing but extra scrutiny has been added to try and stamp out invalid one off GPS speeds recieved such as 750km/h, 
            	* my car simply can't go that fast :-(
            	*/
            	if (parseInt(gpsData.speed) < 80) {
                    var topSpeed = parseInt(gpsData.speed);
            	} else if ((typeof dataPoints[dataPoints.length - 1].speed !=="undefined") && 
            			  (parseInt(gpsData.speed) - parseInt(dataPoints[dataPoints.length - 1].speed) < 30)) {
            		var topSpeed = parseInt(gpsData.speed);
            	}
            } else {
                    var topSpeed = parseInt(tripData.top_speed);
            }

            if ((!isNaN(gpsAltitude)) && (parseInt(gpsAltitude) > parseInt(tripData.highest_altitude))) {
                    var highestAltitude = parseInt(gpsAltitude);
            } else {
                    var highestAltitude = parseInt(tripData.highest_altitude);
            }            
		} else {
			var tripTime = 0;
			var topSpeed = 0;
			var highestAltitude = 0;
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

			var totalDistance = Math.round( 
											(
												tripData.distance + distanceTravelled
											), 2 
										   );

		}

		var tripDetails = {
			'distance' : totalDistance,
			'time' : tripTime,
            'top_speed' : topSpeed,	
            'highest_altitude' : highestAltitude,            		
			'data_points' : dataPoints
		}		

		window.localStorage['trip_data'] = JSON.stringify( tripDetails );
	}


	/**
	* Haversine formulae for calculating between two points
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

	  var R = 6371; // km

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

		var getGps = getGpsData('/php/services.php?action=speed-limit&location=' + latitude + ',' + longitude);

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
	* @return string $headingDegrees
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
	*
	* @return integer carSpeed
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

		getMapZoom: function( mapLatitude, distanceTravelled ) {

			return getMapZoom( mapLatitude, distanceTravelled );

		},

		updateTrip: function( gpsData, checkFrequency ) {

			return updateTrip( gpsData, checkFrequency );

		},

		updateTrip: function( gpsData, checkFrequency ) {

			return updateTrip( gpsData, checkFrequency );

		},

		getLocationData: function() {

			return getLocationData();

		}

	}
});