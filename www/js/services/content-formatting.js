angular.module('contentFormatting', [])

/**
 * Service providing miscellanous dormatting utlilities 
 */
.factory('contentFormatting', function($http, $log, $rootScope) {
	
	/**
	* Get the current system time
	*
	* @param integer timeStamp
	* @return string getTime
	*/
	function getSystemTime( timeStamp )
	{
	    var d = new Date( timeStamp ),
        minutes = d.getMinutes().toString().length == 1 ? '0'+ d.getMinutes() : d.getMinutes(),
        hours = d.getHours().toString().length == 1 ? '0'+ d.getHours() : d.getHours(),
        ampm = d.getHours() >= 12 ? 'pm' : 'am',
        months = [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December'
                  ],
        days = [
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday'
                ];

    	var monthDate = dateFormat( d.getDate() );	

		var formattedDate = days[d.getDay()] + ' ' + 
                          monthDate + ' ' + 
                          months[d.getMonth()] + ' ' + 
                          d.getFullYear() + ' - ' + 
                          hours + ':' + minutes + ampm;    		

        return formattedDate;
	}

	/**
	* Format the day of the month into something a little more presentable
	*	
	* @param dayNumber
	*
	* @return string
	*/
	function dateFormat( dayNumber )
	{
	    dayNumber = Number( dayNumber );

	    if(!dayNumber || (Math.round(dayNumber) !== dayNumber)) {
	      return dayNumber;
	    }
	    var numberSignal = (dayNumber < 20) ? dayNumber : Number(('' + dayNumber).slice(-1));

	    switch(numberSignal) {
	      case 1:
	        return dayNumber + 'st'
	      case 2:
	        return dayNumber + 'nd'
	      case 3:
	        return dayNumber + 'rd'
	      default:
	        return dayNumber + 'th'
	    }		
	}

	/**
	* Format an amount of time in seconds to an hours:minutes:seconds format 
	*
	* @param integer timeSeconds
	*
	* @return string playTime
	*/
	function formatSeconds( timeSeconds )
	{
	    var date = new Date(1970,0,1);
	    date.setSeconds(timeSeconds);
	    
	    var playTime = date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

	    if (playTime.substring(0, 3) == '00:') {
			var playTime = playTime.substring(3);
	    }

	    return playTime;
	}

	/**
	* Format a trip time into a human readable format i.e 1 hours x 5 minutes format 
	*
	* @param integer timeSeconds
	*
	* @return string tripData.time
	*/
	function formatTripTime( timeSeconds )
	{
		var tripTime = formatSeconds( timeSeconds );

	    tripTime = tripTime.split(":");

	    switch (tripTime.length) {
	      case 1:
	        tripTime = tripTime[0] + ' seconds';
	      break;

	      case 2:
	        tripTime = tripTime[0] + ' minutes';
	      break;

	      case 3:
	        tripTime = tripTime[0] + ' hours ' + tripTime[1] + ' minutes';
	      break;
	    }

	    return tripTime;
	}

	/**
	* Convert celcius to farenheit
	*
	* @param integer degreesCelcius
	*
	* @return string 
	*/
	function celciusToFarenheit( degreesCelcius ) {
	    var degreesFarenheit = Math.round( degreesCelcius * 9 / 5 + 32 );

	    return degreesFarenheit;
	}

	/**
	* Convert a speed from km/h to mp/h 
	*
	* @param integer speedKm
	*
	* @return integer speedMph
	*/
	function kmToMiles( distanceKm ) {

	    var distanceMiles = Math.round( distanceKm * 0.621371 );

	    return distanceMiles;
	}

	/**
	* Convert an altitude from metres to feet
	*
	* @param integer heightMetres
	*
	* @return integer heightFeet
	*/
	function metresToFeet( heightMetres ) {
	    var heightFeet = Math.round( heightMetres * 3.28084 );

	    return heightFeet;
	}

	return {
		getSystemTime: function( timeStamp ) {
			return getSystemTime( timeStamp );
		},

		dateFormat: function( dayNumber ) {
			return dateFormat( dayNumber );
		},

		celciusToFarenheit: function( degreesCelcius ) {
			return celciusToFarenheit( degreesCelcius );
		},

		kmhToMph: function( speedKm ) {
			return kmToMiles( speedKm );
		},

		kmToMiles: function( distanceKm ) {
			return kmToMiles( distanceKm );
		},

		metresToFeet: function( heightMetres ) {
			return metresToFeet( heightMetres );
		},

		formatTripTime: function( timeSeconds ) {
			return formatTripTime( timeSeconds );
		},

		formatSeconds: function( timeSeconds ) {
			return formatSeconds( timeSeconds );
		}

	}
});