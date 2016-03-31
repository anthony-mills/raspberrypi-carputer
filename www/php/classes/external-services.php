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

	// GPSD server settings
	protected $_gpsdHost = 'localhost';
	protected $_gpsdPort = 2947;	

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
	*/
	public function getSpeed($currentLocation) {
		
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
				echo $apiResponse;
			}
		}	
	}

	/**
	* Get the current weather outlook
	*
	* @param string $curLongitude	
	* @param string $curLatitude
	*/
	public function getWeather($curLongitude, $curLatitude) {
		$apiUrl = $this->_baseWeatherAPI . '?app_id=' . $this->_hereAppId . '&product=observation&app_code=' . $this->_hereAppCode . '&longitude=151.206939&latitude=-33.873427';
		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			echo $apiResponse;
		}
	}

	/**
	* Talk to the GPSD daemon and hopefully get some location data
	*
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

		echo $gpsResponse;
	}
	/**
	* Get the current weather forecast
	*
	* @param string $curLongitude	
	* @param string $curLatitude
	*/
	public function getForecast($curLongitude, $curLatitude) {
		$apiUrl = $this->_baseWeatherAPI . '?app_id=' . $this->_hereAppId . '&product=forecast_7days_simple&app_code=' . $this->_hereAppCode . '&longitude=151.206939&latitude=-33.873427';
		$apiResponse = $this->apiCall($apiUrl);

		if ($apiResponse) {
			echo $apiResponse;
		}
	}

	/**
	* Make a CURL request to an API endpoint
	*
	* @param string $apiUrl
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
                    $gpsResponse = @fread($gpsdSock, 1000);
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