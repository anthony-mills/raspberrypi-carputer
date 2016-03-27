<?php 
/**
*	Get speed limit for a location
*/
$requestedAction= $_GET['action'];

if (!$requestedAction) {
	die('No action found.');
}

$serviceObj = new apiServices();

switch ($requestedAction) {
	case 'speed-limit':
		$currentLocation = filter_input(INPUT_GET, 'location', FILTER_SANITIZE_SPECIAL_CHARS);

		$serviceObj->getSpeed($currentLocation);
	break;

	case 'get-location':
		$serviceObj->getLocation();
	break;

	case 'weather-outlook':
		$curLatitude = filter_input(INPUT_GET, 'latitude', FILTER_SANITIZE_SPECIAL_CHARS);
		$curLongitude = filter_input(INPUT_GET, 'longitude', FILTER_SANITIZE_SPECIAL_CHARS);

		$serviceObj->getWeather($curLongitude, $curLatitude);
	break;

	case 'weather-forecast':
		$curLatitide = filter_input(INPUT_GET, 'latitude', FILTER_SANITIZE_SPECIAL_CHARS);
		$curLongitude = filter_input(INPUT_GET, 'longitude', FILTER_SANITIZE_SPECIAL_CHARS);

		$serviceObj->getForecast($curLongitude, $curLatitude);
	break;
}

class apiServices {
	protected $_hereAppId = 'MYAPPID';
	protected $_hereAppCode = 'MYAPPCODE';	
	protected $_baseWeatherAPI = 'https://weather.cit.api.here.com/weather/1.0/report.json';
	protected $_baseSpeedAPI = 'http://route.st.nlp.nokia.com/routing/6.2/getlinkinfo.xml';

	// Live or debug GPS data
	protected $_debugGps = false;
	protected $_gpsDebugFile = 'gps_data.json';

	// GPSD server settings
	protected $_gpsdHost = 'localhost';
	protected $_gpsdPort = 2947;	

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
			if (file_exists($this->_gpsDebugFile)) {
				$gpsResponse = file_get_contents($this->_gpsDebugFile);
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
		$gpsdSock = @fsockopen(	$this->_gpsdHost, $this->_gpsdHost, $errNo, $errStr, 2 );

		@fwrite($gpsdSock, "?WATCH={\"enable\":true}\n");
		usleep(1000);

		@fwrite($gpsdSock, "?POLL;\n");
		usleep(1000);

		for($tries = 0; $tries < 10; $tries++){
			$gpsResponse = @fread($gpsdSock, 2000);
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
