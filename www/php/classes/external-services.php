<?php
/**
* Functionality handling communication with external data API's and the GPSD daemon
*
*/
class apiServices {
	protected $_hereAppId = 'MYAPPID';
	protected $_hereAppCode = 'MYAPPCODE';

	protected $_baseSpeedAPI = 'http://route.st.nlp.nokia.com/routing/7.2/getlinkinfo.xml';

	// Live or debug GPS data
	protected $_debugGps = false;
	protected $_gpsDebugFile = '../data/gps_data.json';

	// Location IQ Related Parameters
	protected $_locationIqKey = 'MYAPIKEY';
	protected $_locationIqEndpoint = 'http://osm1.unwiredlabs.com/locationiq/v1/reverse.php';
	protected $_locationIqFormat = 'json'; // Valid options are json,jsonv2,html or xml

	// GPSD server settings
	protected $_gpsdHost = 'localhost';
	protected $_gpsdPort = 2947;
	protected $_gpsRead = 2000;	
	protected $_pollDelay = '400';

	// Weather variables
	protected $_baseWeatherAPI = 'https://www.metaweather.com/api/';

	protected $_weatherUnits = "metric";
	protected $_defaultLocation = array(
									'longitude' => 151.206939,
									'latitude' => -33.873427
								  );	

	/**
	* Set the config parameters for the LocationIq.com API
	* 
	* @param array $locationIqConf
	*/
	public function setLocationIqConf( $locationIqConf ) {
		$this->_locationIqKey = $locationIqConf['locationiq-key'];	
	}

	/**
	* Set the API key for the Open Weather API
	*
	* ( see https://openweathermap.org/ foor more details ) 
	* @param array $locationIqConf
	*/
	public function setOpenWeatherConf( $openWeatherConf ) {
		$this->_openWeatherKey = $openWeatherConf['weather-key'];	
	}

	/**
	* Set the config parameters for the HERE.com API
	* 
	* @param array $hereConf
	*/
	public function setHereConf( $hereConf ) {
		$this->_hereAppId = $hereConf['here-app-id'];
		$this->_hereAppCode = $hereConf['here-app-code'];				
	}

	/**
	* Set the options for the GPSD daemon
	* 
	* @param array $gpsConf
	*/
	public function setGpsConf( $gpsConf ) {
		$this->_gpsdPort = $gpsConf['gpsd-port'];
		$this->_gpsdHost = $gpsConf['gpsd-host'];
		$this->_debugGps = $gpsConf['gpsd-debug'];				
	}

	/**
	* Get the speed limit for a particular location
	*
	* @param array $curLocation
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getSpeedLimit( $curLocation ) {
		
		$curLocation = $this->_checkLocation( $curLocation );

		$apiUrl = $this->_baseSpeedAPI . '?app_id=' . $this->_hereAppId . '&app_code=' . $this->_hereAppCode . '&waypoint=' . $curLocation['longitude'] . ',' . $curLocation['latitude'] . '&linkattributes=all';

		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			$apiResponse = array_pop(explode('<SpeedLimit>', $apiResponse));
			$apiResponse = str_replace('"' , '' ,array_shift(explode('</SpeedLimit>', $apiResponse)));

			if (is_numeric($apiResponse)) {
				if ($apiResponse > 0) {
					$apiResponse = round($apiResponse * 18 / 5);
				} 
				return $apiResponse;
			}
		}	
	}

	/**
	* Get the current weather forecast
	*
	* @param array $curLocation
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getForecast( $curLocation ) {

		$curLocation = $this->_checkLocation( $curLocation );
		$weatherLoc = $this->_weatherLocation( $curLocation );

		$apiUrl = $this->_baseWeatherAPI . 'location/' . $weatherLoc . '/';
		
		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			return $apiResponse;
		}
	}


	/**
	* Lookup human readable information about car position
	*
	* @param array $curLocation
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getLocationInfo( $curLocation ) {

		$curLocation = $this->_checkLocation( $curLocation );
		
		$apiUrl = $this->_locationIqEndpoint . '?key=' . $this->_locationIqKey .
					'&format=' . $this->_locationIqFormat . 
					'&lat=' . $curLocation['longitude'] . 
					'&lon=' . $curLocation['latitude'];

		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			return $apiResponse;
		}
	}

	/**
	* Talk to the GPSD daemon and hopefully get some location data
	*
	* @return string $gpsResponse // JSON Object from the GPSD Daemon
	*/
	public function getLocation() {

		// If GPS debugging is enabled simply load in the gps_data.json file and return
		if ($this->_debugGps) {
			if (file_exists(__DIR__ . '/' . $this->_gpsDebugFile)) {
				$gpsResponse = file_get_contents( __DIR__ . '/' . $this->_gpsDebugFile );
			} else {
				$gpsResponse = '{"class":"ERROR","message":"Cannot load GPS debug file"}';
			}
		} else {
			$gpsResponse = $this->_gpsdCall();
		}

		return $gpsResponse;
	}


	/**
	* Make a CURL request to an API endpoint
	*
	* @param string $apiUrl
	*
	* @return string
	*/
	protected function apiCall($apiUrl) {
		if (!function_exists('curl_version')) {
			die ('PHP requires curl support to access external data services.');
		}
		$curl = curl_init();

		curl_setopt_array($curl, array(
		    CURLOPT_RETURNTRANSFER => 1,
		    CURLOPT_URL => $apiUrl
		));

		$apiResponse = curl_exec($curl);
		curl_close($curl);

		return $apiResponse;
	}

	/**
	* Attempt to poll the the GPSD Daemon for location data
	*
	* @return $gpsResponse
	*/
    protected function _gpsdCall() {
            $gpsdSock = @fsockopen( $this->_gpsdHost, $this->_gpsdPort, $errNo, $errStr, 2 );

            @fwrite($gpsdSock, "?WATCH={\"enable\":true}\n");
            usleep( $this->_pollDelay );

            @fwrite($gpsdSock, "?POLL;\n");
            usleep( $this->_pollDelay );

            for($connectAttempts = 0; $connectAttempts < 10; $connectAttempts++){
                    $gpsResponse = @fread($gpsdSock, $this->_gpsRead);
                    $jsonOb = json_decode($gpsResponse);

                    if (preg_match('/{"class":"POLL".+}/i', $gpsResponse, $respMatch)){

                            $gpsResponse = $respMatch[0];
                            break;
                    }
            }       

            @fclose($gpsdSock);

            if (!$gpsResponse) {
                    $gpsResponse = '{"class":"ERROR","message":"no response from GPS daemon"}';
            }

            return $gpsResponse;            
    }

	/**
	* Get the current weather forecast location
	*
	* @param array $curLocation
	*
	* @return string $apiResponse // JSON Object	
	*/
	protected function _weatherLocation( $curLocation ) {

		$curLocation = $this->_checkLocation( $curLocation );

		$apiUrl = $this->_baseWeatherAPI . 'location/search/?lattlong='
					. $curLocation['latitude'] . ',' . $curLocation['longitude'];
		
		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {

			$apiResponse = json_decode($apiResponse);

			if (count($apiResponse) > 0 ) {
				$locObj = array_shift($apiResponse);

				return $locObj->woeid;
			}
		}
	}

    /**
    * Check the provided location
    * 
    * param array $curLocation
    *
    * return array $curLocation
    */
    protected function _checkLocation( $curLocation ) {
		if ((!$curLocation['longitude']) || (!$curLocation['latitude'])) {
			$curLocation = array(
									'longitude' => $this->_defaultLocation['longitude'],
									'latitude' => $this->_defaultLocation['latitude']
								);
		}		

		return $curLocation;
    }
}
