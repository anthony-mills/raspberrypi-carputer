<?php

# @MASTER@

# Copyright (c) 2006,2010 Chris Kuethe <chris.kuethe@gmail.com>
#
# Permission to use, copy, modify, and distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
# ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
# ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
# OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

# Changed to Google Maps API v3, requires no API key, and shorter code
# Sanjeev Gupta <ghane0@gmail.com> 2013-01-05

global $head, $blurb, $title, $showmap, $autorefresh, $footer, $gmap_key;
global $server, $advertise, $port, $open, $swap_ew, $testmode;
$testmode = 0; # leave this set to 1

# Public script parameters:
#   host: host name or address where GPSd runs. Default: from config file
#   port: port of GPSd. Default: from config file
#   op=view: show just the skyview image instead of the whole HTML page
#     sz=small: used with op=view, display a small (240x240px) skyview
#   op=json: respond with the GPSd POLL JSON structure
#     jsonp=prefix: used with op=json, wrap the POLL JSON in parentheses
#                   and prepend prefix

# If you're running PHP with the Suhosin patch (like the Debian PHP5 package),
# it may be necessary to increase the value of the
# suhosin.get.max_value_length parameter to 2048. The imgdata parameter used
# for displaying the skyview is longer than the default 512 allowed by Suhosin.
# Debian has the config file at /etc/php5/conf.d/suhosin.ini.

# this script shouldn't take more than a few seconds to run
set_time_limit(3);
ini_set('max_execution_time', 3);

if (!file_exists("gpsd_config.inc"))
	write_config();

require_once("gpsd_config.inc");

# sample data
$resp = <<<EOF
{"class":"POLL","time":"2010-04-05T21:27:54.84Z","active":1,
 "tpv":[{"class":"TPV","tag":"MID41","device":"/dev/ttyUSB0",
           "time":1270517264.240,"ept":0.005,"lat":-33.873427,
           "lon":151.206939,"alt":31.1,"track":99.4319,
           "speed":25.123,"mode":3}],
 "sky":[{"class":"SKY","tag":"MID41","device":"/dev/ttyUSB0",
              "time":"2010-04-05T21:27:44.84Z","hdop":9.20,"vdop":12.1,
              "satellites":[{"PRN":16,"el":55,"az":42,"ss":36,"used":true},
                            {"PRN":19,"el":25,"az":177,"ss":0,"used":false},
                            {"PRN":7,"el":13,"az":295,"ss":0,"used":false},
                            {"PRN":6,"el":56,"az":135,"ss":32,"used":true},
                            {"PRN":13,"el":47,"az":304,"ss":0,"used":false},
                            {"PRN":23,"el":66,"az":259,"ss":40,"used":true},
                            {"PRN":20,"el":7,"az":226,"ss":0,"used":false},
                            {"PRN":3,"el":52,"az":163,"ss":32,"used":true},
                            {"PRN":31,"el":16,"az":102,"ss":0,"used":false}
                           ]
             }
            ]
}
EOF;



# if we're passing in a query, let's unpack and use it
$op = isset($_GET['op']) ? $_GET['op'] : '';
if (isset($_GET['imgdata']) && $op == 'view'){
	$resp = base64_decode($_GET['imgdata']);
	if ($resp){
		gen_image($resp);
		exit(0);
	}
} else {
	if (isset($_GET['host']))
		if (!preg_match('/[^a-zA-Z0-9\.-]/', $_GET['host']))
			$server = $_GET['host'];

	if (isset($_GET['port']))
		if (!preg_match('/\D/', $_GET['port']) && ($port>0) && ($port<65536))
			$port = $_GET['port'];

	if ($testmode){
		$sock = @fsockopen($server, $port, $errno, $errstr, 2);
		@fwrite($sock, "?WATCH={\"enable\":true}\n");
		usleep(1000);
		@fwrite($sock, "?POLL;\n");
		usleep(1000);
		for($tries = 0; $tries < 10; $tries++){
			$resp = @fread($sock, 2000); # SKY can be pretty big
			if (preg_match('/{"class":"POLL".+}/i', $resp, $m)){
				$resp = $m[0];
				break;
			}
		}
		@fclose($sock);
		if (!$resp)
			$resp = '{"class":"ERROR","message":"no response from GPS daemon"}';
	}
}

if ($op == 'view')
	gen_image($resp);
else if ($op == 'json')
	write_json($resp);
else
	write_html($resp);

exit(0);

###########################################################################
# Function to decide if a PRN is a true GPS bird or SBAS, GBAS, etc.
# Sanjeev Gupta <ghane0@gmail.com> 20150408
# Please refer to gps.h lines ~~ 95 , for a central definition
function isGPS($PRN) {
	if ($PRN <= 32) return TRUE ; 			# Navstar GPS
	if ($PRN >= 64 && $PRN <= 96) return TRUE ; 	# GLONASS
	if ($PRN >= 159 ) return TRUE ; 		# BeiDou ?
	return FALSE ;					# SBAS, GBAS, unknown
	}

function colorsetup($im){
	$C['white']	= imageColorAllocate($im, 255, 255, 255);
	$C['ltgray']	= imageColorAllocate($im, 191, 191, 191);
	$C['mdgray']	= imageColorAllocate($im, 127, 127, 127);
	$C['dkgray']	= imageColorAllocate($im, 63, 63, 63);
	$C['black']	= imageColorAllocate($im, 0, 0, 0);
	$C['red']	= imageColorAllocate($im, 255, 0, 0);
	$C['brightgreen'] = imageColorAllocate($im, 0, 255, 0);
	$C['darkgreen']	= imageColorAllocate($im, 0, 192, 0);
	$C['blue']	= imageColorAllocate($im, 0, 0, 255);
	$C['cyan']	= imageColorAllocate($im, 0, 255, 255);
	$C['magenta']	= imageColorAllocate($im, 255, 0, 255);
	$C['yellow']	= imageColorAllocate($im, 255, 255, 0);
	$C['orange']	= imageColorAllocate($im, 255, 128, 0);

	return $C;
}

function legend($im, $sz, $C){
	$r = 30;
	$fn = 5;
	$x = $sz - (4*$r+7) - 2;
	$y = $sz - $r - 3;

	imageFilledRectangle($im, $x, $y, $x + 4*$r + 7, $y + $r +1, $C['dkgray']);
	imageRectangle($im, $x+0*$r+1, $y+1, $x + 1*$r + 0, $y + $r, $C['red']);
	imageRectangle($im, $x+1*$r+2, $y+1, $x + 2*$r + 2, $y + $r, $C['yellow']);
	imageRectangle($im, $x+2*$r+4, $y+1, $x + 3*$r + 4, $y + $r, $C['darkgreen']);
	imageRectangle($im, $x+4*$r+6, $y+1, $x + 3*$r + 6, $y + $r, $C['brightgreen']);
	imageString($im, $fn, $x+3+0*$r, $y+$r/3, "<30", $C['red']);
	imageString($im, $fn, $x+5+1*$r, $y+$r/3, "30+", $C['yellow']);
	imageString($im, $fn, $x+7+2*$r, $y+$r/3, "35+", $C['darkgreen']);
	imageString($im, $fn, $x+9+3*$r, $y+$r/3, "40+", $C['brightgreen']);
}

function radial($angle, $sz){
	#turn into radians
	$angle = deg2rad($angle);

	# determine length of radius
	$r = $sz * 0.5 * 0.95;

	# and convert length/azimuth to cartesian
	$x0 = sprintf("%d", (($sz * 0.5) - ($r * cos($angle))));
	$y0 = sprintf("%d", (($sz * 0.5) - ($r * sin($angle))));
	$x1 = sprintf("%d", (($sz * 0.5) + ($r * cos($angle))));
	$y1 = sprintf("%d", (($sz * 0.5) + ($r * sin($angle))));

	return array($x0, $y0, $x1, $y1);
}

function azel2xy($az, $el, $sz){
	global $swap_ew;
	#rotate coords... 90deg W = 180deg trig
	$az += 270;

	#turn into radians
	$az = deg2rad($az);

	# determine length of radius
	$r = $sz * 0.5 * 0.95;
	$r -= ($r * ($el/90));

	# and convert length/azimuth to cartesian
	$x = sprintf("%d", (($sz * 0.5) + ($r * cos($az))));
	$y = sprintf("%d", (($sz * 0.5) + ($r * sin($az))));
	if ($swap_ew == 0)
		$x = $sz - $x;

	return array($x, $y);
}

function splot($im, $sz, $C, $e){
	if ((0 == $e['PRN']) || (0 == $e['az'] + $e['el'] + $e['ss']) ||
	    ($e['az'] < 0) || ($e['el'] < 0))
		return;

	$color = $C['brightgreen'];
	if ($e['ss'] < 40)
		$color = $C['darkgreen'];
	if ($e['ss'] < 35)
		$color = $C['yellow'];
	if ($e['ss'] < 30)
		$color = $C['red'];
	if ($e['el']<10)
		$color = $C['blue'];
	if ($e['ss'] < 10)
		$color = $C['black'];

	list($x, $y) = azel2xy($e['az'], $e['el'], $sz);

	$r = 12;
	if (isset($_GET['sz']) && ($_GET['sz'] == 'small'))
		$r = 8;

	imageString($im, 3, $x+4, $y+4, $e['PRN'], $C['black']);
        if ($e['used'] == true)
		if (isGPS($e['PRN']))
			imageFilledArc($im, $x, $y, $r, $r, 0, 360, $color, 0);
		else
			imageFilledDiamond($im, $x, $y, $r, $color);
	else
		if (isGPS($e['PRN']))
			imageArc($im, $x, $y, $r, $r, 0, 360, $color);
		else
			imageDiamond($im, $x, $y, $r, $color);
}


function imageDiamond($im, $x, $y, $r, $color){
	$t = $r/2;
	# this lunacy is because imagesetthickness doesn't seem to work
	$vx = array ( $x+$t, $y, $x, $y+$t, $x-$t, $y, $x, $y-$t );
	imagepolygon($im, $vx, 4, $color);
	$t--;
	$vx = array ( $x+$t, $y, $x, $y+$t, $x-$t, $y, $x, $y-$t );
	imagepolygon($im, $vx, 4, $color);
	$t--;
	$vx = array ( $x+$t, $y, $x, $y+$t, $x-$t, $y, $x, $y-$t );
	imagepolygon($im, $vx, 4, $color);
}

function imageFilledDiamond($im, $x, $y, $r, $color){
	$t = $r/2;
	while($t){
		$vx = array ( $x+$t, $y, $x, $y+$t, $x-$t, $y, $x, $y-$t );
		imagepolygon($im, $vx, 4, $color);
		$t -= 0.5;
	}
}

function elevation($im, $sz, $C, $a){
	$b = 90 - $a;
	$a = $sz * 0.95 * ($a/180);
	imageArc($im, $sz/2, $sz/2, $a*2, $a*2, 0, 360, $C['ltgray']);
	$x = $sz/2 - 16;
	$y = $sz/2 - $a;
	imageString($im, 2, $x, $y, $b, $C['ltgray']);
}

function skyview($im, $sz, $C){
	global $swap_ew;
	$a = 90; $a = $sz * 0.95 * ($a/180);
	imageFilledArc($im, $sz/2, $sz/2, $a*2, $a*2, 0, 360, $C['mdgray'], 0);
	imageArc($im, $sz/2, $sz/2, $a*2, $a*2, 0, 360, $C['black']);
	$x = $sz/2 - 16; $y = $sz/2 - $a;
	imageString($im, 2, $x, $y, "0", $C['ltgray']);

	$a = 85; $a = $sz * 0.95 * ($a/180);
	imageFilledArc($im, $sz/2, $sz/2, $a*2, $a*2, 0, 360, $C['white'], 0);
	imageArc($im, $sz/2, $sz/2, $a*2, $a*2, 0, 360, $C['ltgray']);
	imageString($im, 1, $sz/2 - 6, $sz+$a, '5', $C['black']);
	$x = $sz/2 - 16; $y = $sz/2 - $a;
	imageString($im, 2, $x, $y, "5", $C['ltgray']);

	for($i = 0; $i < 180; $i += 15){
		list($x0, $y0, $x1, $y1) = radial($i, $sz);
		imageLine($im, $x0, $y0, $x1, $y1, $C['ltgray']);
	}

	for($i = 15; $i < 90; $i += 15)
		elevation($im, $sz, $C, $i);

	$x = $sz/2 - 16; $y = $sz/2 - 8;
	/* imageString($im, 2, $x, $y, "90", $C['ltgray']); */

	imageString($im, 4, $sz/2 + 4, 2        , 'N', $C['black']);
	imageString($im, 4, $sz/2 + 4, $sz - 16 , 'S', $C['black']);
	if ($swap_ew == 0){
		imageString($im, 4, 4        , $sz/2 + 4, 'E', $C['black']);
		imageString($im, 4, $sz - 10 , $sz/2 + 4, 'W', $C['black']);
	} else {
		imageString($im, 4, 4        , $sz/2 + 4, 'W', $C['black']);
		imageString($im, 4, $sz - 10 , $sz/2 + 4, 'E', $C['black']);
	}
}

function gen_image($resp){
	$sz = 600;
	if (isset($_GET['sz']) && ($_GET['sz'] == 'small'))
		$sz = 240;

	$GPS = json_decode($resp, true);
	if ($GPS['class'] != "POLL"){
		die("json_decode error: $resp");
	}

	$im = imageCreate($sz, $sz);
	$C = colorsetup($im);
	skyview($im, $sz, $C);
	if ($sz > 240)
		legend($im, $sz, $C);

	for($i = 0; $i < count($GPS['sky'][0]['satellites']); $i++){
		splot($im, $sz, $C, $GPS['sky'][0]['satellites'][$i]);
	}

	header("Content-type: image/png");
	imagePNG($im);
	imageDestroy($im);
}

function dfix($x, $y, $z){
	if ($x < 0){
		$x = sprintf("%f %s", -1 * $x, $z);
	} else {
		$x = sprintf("%f %s", $x, $y);
	}
	return $x;
}

function write_html($resp){
	global $sock, $errstr, $errno, $server, $port, $head, $body, $open;
	global $blurb, $title, $autorefresh, $showmap, $gmap_key, $footer;
	global $testmode, $advertise;

	$GPS = json_decode($resp, true);
	if ($GPS['class'] != 'POLL'){
		die("json_decode error: $resp");
	}

	header("Content-type: text/html; charset=UTF-8");

	global $lat, $lon;
	$lat = (float)$GPS['tpv'][0]['lat'];
	$lon = (float)$GPS['tpv'][0]['lon'];
	$x = $server; $y = $port;
	$imgdata = base64_encode($resp);
	$server = $x; $port = $y;

	if ($autorefresh > 0)
		$autorefresh = "<meta http-equiv='Refresh' content='$autorefresh'/>";
	else
		$autorefresh = '';

	$map_head = $map_body = $map_code = '';
	if ($showmap == 1) {
		$map_head = gen_gmap_head();
		$map_body = 'onload="Load()" onunload="GUnload()"';
		$map_code = gen_map_code();
	} else if ($showmap == 2) {
		$map_head = gen_osm_head();
		$map_body = 'onload="Load()"';
		$map_code = gen_map_code();
	}
	$part1 = <<<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
{$head}
{$map_head}
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta http-equiv="Content-Language" content="en,en-us"/>
<title>{$title} - GPSD Test Station {$lat}, {$lon}</title>
{$autorefresh}
<style>
.warning {
    color: #FF0000;
}

.fixed {
    font-family: mono-space;
}

.caption {
    text-align: left;
    margin: 1ex 3em 1ex 3em; /* top right bottom left */
}

.administrivia {
    font-size: small;
    font-family: verdana, sans-serif;
}
</style>
</head>

<body {$body} {$map_body}>
<center>
<table border="0">
<tr><td align="justify">
{$blurb}
</td>
EOF;

	if (!strlen($advertise))
		$advertise = $server;

	if ($testmode && !$sock)
		$part2 = "";
	else
		$part2 = <<<EOF
<!-- ------------------------------------------------------------ -->

<td rowspan="4" align="center" valign="top">
<img src="?op=view&amp;imgdata={$imgdata}"
width="600" height="600"/>
<br clear="all"/>
<p class="caption">A filled circle means the satellite was used in
the last fix. Green-yellow-red colors indicate signal strength in dB,
green=most and red=least.  Diamonds indicate Augmentation satellites.</p>
{$map_code}</td>
</tr>
EOF;

	if (!$open)
		$part3 = '';
	else
		$part3 = <<<EOF
<!-- ------------------------------------------------------------ -->

<tr><td align="justify">To get real-time information, connect to
<span class="fixed">telnet://{$advertise}:{$port}/</span> and type "?POLL;"
or "?WATCH={"enable":true,"raw":true}".<br/>
Use a different server:<br/>
<form method=GET action="${_SERVER['SCRIPT_NAME']}">
<input name="host" value="{$advertise}">:
<input name="port" value="{$port}" size="5" maxlength="5">
<input type=submit value="Get Position"><input type=reset></form>
<br/>
</td>
</tr>
EOF;

	if ($testmode && !$sock)
		$part4 = "<tr><td class='warning'>The gpsd instance that this page monitors is not running.</td></tr>";
	else {
		$fix = $GPS['tpv'][0];
		$sky = $GPS['sky'][0];
		$sats = $sky['satellites'];

		$nsv = count($sats);
                $ts = $fix['time'];
                $sat = '';
                foreach($sats as $s)
                        $sat .= sprintf(
                                "\t<tr><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%s</td></tr>\n",
                                $s['PRN'], $s['el'], $s['az'], $s['ss'], $s['used'] ? 'Y' : 'N'
                        );
		$part4 = <<<EOF
<!-- ------------------------------------------------------------ -->
<tr><td align=center valign=top>
    <table border=1>
        <tr><th colspan=2 align=center>Current Information</th></tr>
        <tr><td>Time (UTC)</td><td>{$ts}</td></tr>
        <tr><td>Latitude</td><td>{$fix['lat']}</td></tr>
        <tr><td>Longitude</td><td>{$fix['lon']}</td></tr>
        <tr><td>Altitude</td><td>{$fix['alt']}</td></tr>
        <tr><td>Fix Type</td><td>{$fix['mode']}</td></tr>
        <tr><td>Satellites</td><td>{$nsv}</td></tr>
        <tr><td>HDOP</td><td>{$sky['hdop']}</td></tr>
        <tr><td>VDOP</td><td>{$sky['vdop']}</td></tr>
    </table>
    <br/>
    <table border=1>
        <tr><th colspan=5 align=center>Current Satellites</th></tr>
        <tr><th>PRN</th><th>Elevation</th><th>Azimuth</th><th>SS</th><th>Used</th></tr>
$sat    </table>
</td></tr>

<!-- raw response:
{$resp}
-->
EOF;
	}

	$part5 = <<<EOF

</table>
</center>
{$footer}
<hr/>
<p class="administrivia">This script is distributed by the
<a href="@WEBSITE@">GPSD project</a>.</p>

</body>
</html>
EOF;

print $part1 . $part2 . $part3 . $part4 . $part5;

}

function write_json($resp){
	header('Content-Type: text/javascript');
	if (isset($_GET['jsonp']))
		print "{$_GET['jsonp']}({$resp})";
	else
		print $resp;
}

function write_config(){
	$f = fopen("gpsd_config.inc", "a");
	if (!$f)
		die("can't generate prototype config file. try running this script as root in DOCUMENT_ROOT");

	$buf = <<<EOB
<?PHP
\$title = 'My GPS Server';
\$server = 'localhost';
#\$advertise = 'localhost';
\$port = 2947;
\$autorefresh = 0; # number of seconds after which to refresh
\$showmap = 0; # set to 1 if you want to have a google map, set it to 2 if you want a map based on openstreetmap
\$gmap_key = 'GetYourOwnGoogleKey'; # your google API key goes here
\$swap_ew = 0; # set to 1 if you don't understand projections
\$open = 0; # set to 1 to show the form to change the GPSd server

## You can read the header, footer and blurb from a file...
# \$head = file_get_contents('/path/to/header.inc');
# \$body = file_get_contents('/path/to/body.inc');
# \$footer = file_get_contents('/path/to/footer.hinc');
# \$blurb = file_get_contents('/path/to/blurb.inc');

## ... or you can just define them here
\$head = '';
\$body = '';
\$footer = '';
\$blurb = <<<EOT
This is a
<a href="@WEBSITE@">gpsd</a>
server <blink><font color="red">located someplace</font></blink>.

The hardware is a
<blink><font color="red">hardware description and link</font></blink>.

This machine is maintained by
<a href="mailto:you@example.com">Your Name Goes Here</a>.<br/>
EOT;

?>

EOB;
	fwrite($f, $buf);
	fclose($f);
}

function gen_gmap_head() {
global $gmap_key;
return <<<EOT
<script src="//maps.googleapis.com/maps/api/js?sensor=false"
        type="text/javascript">
</script>

<script type="text/javascript">
 <!--
    function Load() {
      var map = new google.maps.Map(
        document.getElementById('map'), {
          center: new google.maps.LatLng({$GLOBALS['lat']}, {$GLOBALS['lon']}),
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP
      });

      var marker = new google.maps.Marker({
            position: new google.maps.LatLng({$GLOBALS['lat']}, {$GLOBALS['lon']}),
            map: map
      });

    }
    google.maps.event.addDomListener(window, 'load', initialize);

 -->
</script>
EOT;
}

function gen_osm_head() {
global $GPS;
return <<<EOT
<script src="http://openlayers.org/api/OpenLayers.js" type="text/javascript"></script>
<script type="text/javascript">
    <!--
function Load() {
	document.getElementById("map").firstChild.data = "";
	var map = new OpenLayers.Map("map", {
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.PanZoomBar(),
			new OpenLayers.Control.ScaleLine(),
			new OpenLayers.Control.LayerSwitcher()
		]
	});
	var layer = new OpenLayers.Layer.OSM("Open Street Map");
	map.addLayer(layer);

	var center = new OpenLayers.LonLat({$GLOBALS['lon']}, {$GLOBALS['lat']})
		.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
	map.setCenter(center, 12);

	var markers = new OpenLayers.Layer.Markers("Markers");
	markers.addMarker(new OpenLayers.Marker(center));
	map.addLayer(markers);
}
    -->
    </script>
EOT;
}

function gen_map_code() {
return <<<EOT
<br/>
<div id="map" style="width: 550px; height: 400px; border:1px; border-style: solid;">
    Loading...
    <noscript>
        <span class='warning'>Sorry: you must enable javascript to view our maps.</span><br/>
    </noscript>
</div>

EOT;
}

?>

