angular.module('contentFormatting', [])

/**
 * Service providing miscellanous dormatting utlilities 
 */
.factory('contentFormatting', function($http, $log, $rootScope) {
	
	/**
	* Get the current time
	*
	* @return string getTime
	*/
	function getTime()
	{
	    var d = new Date(),
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
	* Format the day of the month into something a little more presentatable
	*	
	* @param dateObj
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

	return {
		getTime: function() {
			return getTime();
		},

		formatSeconds: function( timeSeconds ) {
			return formatSeconds( timeSeconds );
		}

	}
});