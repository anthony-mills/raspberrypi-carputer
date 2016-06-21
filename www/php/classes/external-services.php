<?php
/**
* Functionality handling communication with external data API's and the GPSD daemon
*
*/
class apiServices {
	protected $_hereAppId = 'MYAPPID';
	protected $_hereAppCode = 'MYAPPCODE';	
	protected $_baseWeatherAPI = 'https://weather.cit.api.here.com/weather/1.0/report.json';
	protected $_baseSpeedAPI = 'http://route.st.nlp.nokia.com/routing/6.2/getlinkinfo.xml';

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

	// Weather variables
	protected $_metricWeather = "true";
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
	* @param string $currentLocation
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getSpeed( $currentLocation ) {
		
		if (!$currentLocation) {
			die('No location provided');
		}

		$apiUrl = $this->_baseSpeedAPI . '?app_id=' . $this->_hereAppId . '&app_code=' . $this->_hereAppCode . '&waypoint='.$currentLocation.'&linkattributes=all';
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
	* Get the current weather outlook
	*
	* @param string $curLongitude	
	* @param string $curLatitude
	*
	* @return string $apiResponse // JSON Object
	*/
	public function getWeather( $curLongitude=false, $curLatitude=false ) {
		if ((!$curLongitude) || (!$curLatitude)) {
			$curLongitude = $this->_defaultLocation['longitude'];
			$curLatitude = $this->_defaultLocation['latitude'];			
		}

		$apiUrl = $this->_baseWeatherAPI . '?app_id=' . $this->_hereAppId . 
					'&product=observation&app_code=' . $this->_hereAppCode . 
					'&longitude=' . $curLongitude . 
					'&latitude=' . $curLatitude .
					'&metric=' . $this->_metricWeather;

		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			return $apiResponse;
		}

	}

	/**
	* Get the current weather forecast
	*
	* @param string $curLongitude	
	* @param string $curLatitude
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getForecast( $curLongitude=false, $curLatitude=false ) {

		if ((!$curLongitude) || (!$curLatitude)) {
			$curLongitude = $this->_defaultLocation['longitude'];
			$curLatitude = $this->_defaultLocation['latitude'];			
		}		
		$apiUrl = $this->_baseWeatherAPI . '?app_id=' . $this->_hereAppId . 
					'&product=forecast_7days_simple' . 
					'&app_code=' . $this->_hereAppCode . 
					'&longitude=' . $curLongitude . 
					'&latitude=' . $curLatitude .
					'&metric=' . $this->_metricWeather;
					
		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			return $apiResponse;
		}
	}

	/**
	* Lookup human readable information about car position
	*
	* @param string $curLongitude	
	* @param string $curLatitude
	*
	* @return string $apiResponse // JSON Object	
	*/
	public function getLocationInfo( $curLongitude=false, $curLatitude=false ) {

		if ((!$curLongitude) || (!$curLatitude)) {
			$curLongitude = $this->_defaultLocation['longitude'];
			$curLatitude = $this->_defaultLocation['latitude'];			
		}		
		
		$apiUrl = $this->_locationIqEndpoint . '?key=' . $this->_locationIqKey .
					'&format=' . $this->_locationIqFormat . 
					'&lat=' . $curLatitude . 
					'&lon=' . $curLongitude;
		print_r($apiUrl);
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
            usleep(500);

            @fwrite($gpsdSock, "?POLL;\n");
            usleep(500);

            for($connectAttempts = 0; $connectAttempts < 10; $connectAttempts++){
                    $gpsResponse = @fread($gpsdSock, 2000);
                    $jsonOb = json_decode($gpsResponse);

                    //print_r($jsonOb);
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
}
