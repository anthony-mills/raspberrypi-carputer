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
		$currentLocation = $_GET['location'];

		$serviceObj->getSpeed($currentLocation);
	break;

	case 'weather-outlook':
		$curLatitide = $_GET['latitude'];
		$curLongitude = $_GET['longitude'];

		$serviceObj->getWeather($curLongitude, $curLatitide);
	break;

	case 'weather-forecast':
		$curLatitide = $_GET['latitude'];
		$curLongitude = $_GET['longitude'];

		$serviceObj->getForecast($curLongitude, $curLatitide);
	break;	
}

class apiServices {
	protected $_hereAppId = 'MYAPPID';
	protected $_hereAppCode = 'MYAPPCODE';	
	protected $_baseWeatherAPI = 'https://weather.cit.api.here.com/weather/1.0/report.json';
	protected $_baseSpeedAPI = 'http://route.st.nlp.nokia.com/routing/6.2/getlinkinfo.xml';

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
}
