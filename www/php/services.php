<?php 
/**
*	Service router - Handles incoming requests for external data from the car computer UI
*/
$requestedAction = filter_input(INPUT_GET, 'action', FILTER_SANITIZE_SPECIAL_CHARS);

if (!$requestedAction) {
	die('No action found.');
}

$appConfig = parse_ini_file( __DIR__ . '/../../config/config.ini', TRUE);

require_once( __DIR__ . '/classes/external-services.php');

$serviceObj = new apiServices();

$serviceObj->setHereConf( $appConfig['here-api'] );
$serviceObj->setGpsConf( $appConfig['gpsd'] );
$serviceObj->setLocationIqConf( $appConfig['location-iq'] );

$curLatitude = filter_input(INPUT_GET, 'latitude', FILTER_SANITIZE_SPECIAL_CHARS);
$curLongitude = filter_input(INPUT_GET, 'longitude', FILTER_SANITIZE_SPECIAL_CHARS);

switch ($requestedAction) {
	case 'speed-limit':
		echo $serviceObj->getSpeed($curLongitude, $curLatitude);
	break;

	case 'location-info':
		echo $serviceObj->getLocationInfo($curLongitude, $curLatitude);
	break;

	case 'get-location':
		echo $serviceObj->getLocation();
	break;

	case 'weather-outlook':
		echo $serviceObj->getWeather($curLongitude, $curLatitude);
	break;

	case 'weather-forecast':
		echo $serviceObj->getForecast($curLongitude, $curLatitude);
	break;
}