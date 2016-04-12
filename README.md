# Raspberry Pi Car Computer 

This repository is the UI component of a Raspberry Pi car computer set up. [Visit this blog post for more information on the project and building your own Raspberry Pi based "carputer".](https://www.development-cycle.com/2016/02/building-a-raspberry-pi-car-computer/)

# Prerequisites
The UI acts as a frontend for the [MPD](http://www.musicpd.org/) and [GPSD](http://www.catb.org/gpsd/). So to have the frontend work properly these two daemons must be installed and configured. Although for development and testing, a fake GPS data set can be used in place of a live GPS stream to make things easier ( see below under "No GPS" for more details). 

The system uses PHP for getting GPS data so at minimum the PHP5-common, PHP5-cli and PHP5-curl packages must be installed on the system. The application also uses the [HTML5 Filesystem API](http://www.html5rocks.com/en/tutorials/file/filesystem/) for the local storage of album art. This API is poorly supported so either Chromium or Chrome needs to be used for displaying the application.

The UI was designed for use on a car computer built on the Raspberry Pi platform ( has been tested with the 2 & 3 Model B ) combined with the official 7 inch Raspberry Pi touch screen display (800x480). Although it will run happily at other resolutions with the majority of development and testing taking place in [Chromium](https://www.chromium.org/Home) on a standard desktop computer.

# Installation

* Install all of the required dependencies.
* Edit the application config file at config/config.ini and enter your [Here.com API](https://developer.here.com/plans/api/consumer-mapping) details - Required for speed limit and weather information. 
* Also check the GPSD daemon setting in application config file - Should work with the defaults on most setups
* From the command line run the start.sh script to start a and instance of the internal PHP webserver on port 8000.
* Open Chrome or Chromium and visit localhost:8000 to see the application. Keep in mind that it has been designed with the Raspberry Pi Official touch screen in mind i.e 800x468 so if your on a desktop / laptop you may want to use developer tools to switch to a 800x468 viewport. To get get a more realistic idea of what the UI will look like on the end device.

# Running with out a GPS device

GPS functionality can be tested without an active GPS fix or even a GPS device. To enable the GPS testing mode change the value of the gpsd-debug option in the application config file to true. 

This will force the service to read a static GPS json object from the www/php/data/gps_data.json file. By changing the location values in this file a specific location, altitude or speed can be spoofed to test functionality.

# Trip Data Log

By default the system will log a data point about the cars location data ( speed, location , altitutude ) every 60 seconds during a trip to a JSON object that persists using the HTML5 local storage API. This allows for the calculation of average speeds etc along with being able to map the trip using Google maps.

The data never leaves the local system but at the end of a trip you may want to delete the data associated with a trip due to privacy reasons. To achieve this simply select the "Reset Tripmeter" option on the Tripmeter page to delete the data under the trip_data key. In another use case a button has now also been added to the Trip Meter page that will download the trip_data JSON object as a file to the system for later analysis / testing / debugging.

# Credits

This project makes the use of a number of third party Open Source libraries. You are all fantastic! Thank you for all your hardwork its much appreciated!

* [Ionic Framework](https://github.com/driftyco/ionic)
* [ng-elif](https://github.com/zachsnow/ng-elif)
* [mpd.js](https://github.com/bobboau/MPD.js)
* [angular-imgcache.js](https://github.com/jBenes/angular-imgcache.js)
* [angular-growl-2](https://github.com/JanStevens/angular-growl-2)
* [websockify](https://github.com/kanaka/websockify)
* [mpd](http://www.catb.org/gpsd/)
* [gpsd](http://www.musicpd.org/)

# Immediate Roadmap

In the near future the following features are planned:

* Ability to directly skip to a band or folder in the file browser view by the first letter of its name. This will help save time when trying to find an artist when using larger collections of music.
* A settings page allowing the user to change system wide settings such as if the trip loger is active etc.
* The ability to save a play queue to the MPD filesystem as a playlist

# Screenshots

![Home screen while travelling at 54kph and playing music](/screenshots/home_screen_playing.png?raw=true "Home Screen")

![Browsing the music collection stored on the filesystem](/screenshots/music_files.png?raw=true "Music Files")

![Displaying the current location of a car using Google Maps](/screenshots/car_location.png?raw=true "Car location")

![Interacting with the current music play queue](/screenshots/play_queue.png?raw=true "Play Queue")

![Journey Trip Log](/screenshots/trip_log.png?raw=true "Trip Log")

# Licence

Copyright (C) 2016 [Anthony Mills](http://www.anthony-mills.com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.