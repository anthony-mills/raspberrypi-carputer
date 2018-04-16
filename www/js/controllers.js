angular.module('controllers', [])

.controller('AppCtrl', function( $scope, $window, $interval, $timeout, gpsAssist, contentFormatting, Fullscreen ) {

  var appSettings = window.localStorage['app_settings'];

  if (typeof appSettings === "undefined") {
    var appSettings = {
      "speed" : 0,
      "distance" : 0,
      "temperature" : 0,
      "altitude" : 0,     
      "locationiq" : 0,
      "night_mode" : 0,
      "speed_limit" : 0,      
      "time_src" : 0
    }
    
    $scope.appSettings = appSettings;

    window.localStorage['app_settings'] = JSON.stringify(appSettings);
  } else {
    $scope.appSettings = JSON.parse(appSettings); 
  }

  /**
  * Get the GPS data from GPSD for the location panel
  *
  * Default frequency is every second. The interval can probably be increased for a more responsive speed readout on systems using a Raspberry Pi Model 3
  */
  var updateFrequency = 1000;

  $scope.gpsData = {}

  /**
  * Periodically check the time and location data
  **/
  $scope.getGPS = $interval(function() {

    // Use the system time 
    if ($scope.appSettings.time_src == 0) {
      $scope.currentDate = contentFormatting.getSystemTime( Math.floor( Date.now() ) );
    } else {
        console.log( $scope.gpsData.time );

      if ($scope.gpsData.time) {
        var gpsTime = new Date( $scope.gpsData.time );

        $scope.currentDate = contentFormatting.getSystemTime( gpsTime );

      } else {
        $scope.currentDate = '';
      }
    }


    gpsAssist.getLocationData().then(function(gpsData) {

      if ((gpsData.latitude != 'Unknown') && (gpsData.longitude !='Unknown')) {
          window.localStorage['gps_data'] = JSON.stringify( gpsData ); 

          gpsAssist.updateTrip( gpsData, updateFrequency );
      }

      $scope.gpsData = gpsData;

      // Check if user has exited fullscreen via Chrome
      $scope.screenSize();
    });
  }, updateFrequency);

  /**
  * Convert a distance / speed km to miles
  *
  * @param integer distanceKm
  */
  $scope.kmToMiles = function( distanceKm ) {
    return contentFormatting.kmToMiles( distanceKm );
  }

  /**
  * Convert an altitude from m to ft if needed 
  *
  * @param integer altitudeM
  */
  $scope.convertAltitude = function( altitudeM ) {
    return contentFormatting.metresToFeet( altitudeM );
  }  

  /**
  * Apply class to element if the car is currently exceeding the speed limit
  *
  * @param integer speedLimit
  *
  * @return string
  */
  $scope.warnSpeed = function( speedLimit ) {
    if (speedLimit == 1) {
      return 'warn-speed';
    }
  }

  /**
  * Convert a temperature from celcius to farenheit 
  *
  * @param integer tempC
  */
  $scope.convertTemperature = function( tempC ) {
    return contentFormatting.celciusToFarenheit( tempC );
  } 
  
  /**
  * Perform a hard refresh on the application from the browser
  */
  $scope.reloadApp = function() {
    $window.location.reload(true);
  }

  /**
  * Fullscreen the application window
  */
  $scope.minimiseApp = function() {
      if (Fullscreen.isEnabled()) {
         Fullscreen.cancel();      
      } else {
         Fullscreen.all();
      }

      $scope.screenSize();
  } 

  $scope.screenSize = function() {
    if (Fullscreen.isEnabled()) {
      $scope.isFullScreen = 1;
    } else {
      $scope.isFullScreen = 0;    
    }
  } 
})

/**
* Manage the connection to the MPD instance 
* and display main application navigation.
*/
.controller('HomeCtrl', function( $scope, $interval, $timeout, $location, mpdAssist, contentFormatting, growl) {
  $scope.playlistCount = 0;
  $scope.mpdStatus = "Not connected";
  $scope.currentlyPlaying = false;

  /**
  * Return to night mode if that was the last state the UI was in
  */
  if ($scope.appSettings.night_mode === 1) {  
    $location.path('/app/night-mode');
  }

  $scope.playState = mpdClient.getPlaystate();

  var playbackSettings = window.localStorage['playback_settings'];

  if (!playbackSettings) {
    $scope.randomPlayback = mpdClient.isRandom();
    $scope.consumePlayback = mpdClient.isConsume();  

    var playbackSettings = {
      'random' : $scope.randomPlayback,
      'consume' : $scope.consumePlayback
    }

    window.localStorage['playback_settings'] = JSON.stringify(playbackSettings);
    
  } else {

    var playbackSettings = JSON.parse(playbackSettings);

    $scope.randomPlayback = playbackSettings.random;
    $scope.consumePlayback = playbackSettings.consume;
  }

  $scope.playQueue = function() {
    mpdClient.play();
  }

  $scope.checkConnection = $interval(function() {

    var mpdState = mpdClient.getState();    

    $scope.playState = mpdClient.getPlaystate();

    if (mpdState.connected) {

      $scope.mpdStatus = "Connected";

      if (!$scope.playlistCount) {
        // Get the number of songs in the playlist
        $scope.updateQueueLength(); 
      }

      // Music is not currently playing just return 
      if ( $scope.playState === 'stop' || $scope.playState === 'pause' ) {
        return;
      }

      if ( $scope.playState === 'play') {

          if (typeof $scope.currentlyPlaying == "object") {
            var nowPlaying =  $scope.currentlyPlaying;
          } else {
            var nowPlaying = mpdAssist.getPlaying(); 
          }

          // Song is currently playing increment the playback timer
          if ( ( $scope.playState === 'play' ) && ( nowPlaying.playTime.raw > 0 ) && ( nowPlaying.playTime.raw < nowPlaying.duration.raw )) {
            
            nowPlaying.playTime.raw++;

            nowPlaying.playTime.formatted = contentFormatting.formatSeconds( nowPlaying.playTime.raw );

            $scope.currentlyPlaying = nowPlaying;

          } else if ( ( $scope.playState === 'play' ) && ( $scope.currentlyPlaying.playTime.formatted === $scope.currentlyPlaying.duration.formatted )) {

            // Song has ended get the new song and update the queue length
            $scope.currentlyPlaying = mpdAssist.getPlaying(); 

            $scope.updateQueueLength();

            $scope.playState == 'play';        
          } 
      } else {
        $scope.currentlyPlaying = false;        
      }

    } else {
      $scope.mpdStatus = "Not connected";
    }
  }, 1000);

  /**
  * Pause / resume music playback
  */
  $scope.pauseMusic = function() {
    if ($scope.playState === 'play') {
      mpdClient.pause(true);

      $scope.playState = 'pause';

      growl.success("Music playback paused");      
    } else {
      mpdClient.pause(false);

      $scope.playState = 'play';
      
      growl.success("Resuming music playback");      
    }
 
  } 

  /**
  * Update the number of items in the playlist
  */
  $scope.updateQueueLength = function() {

    var playlistSongs = mpdAssist.getQueue();

    $scope.playlistCount = playlistSongs.length; 

  }

  /**
  * Stop the music
  */
  $scope.stopSong = function() {

    mpdClient.stop();
    mpdClient.removeSongFromQueueById( $scope.currentlyPlaying.id );

    $scope.currentlyPlaying = false;
    $scope.playState = 'stop';

    $scope.updateQueueLength();      
  }

  $scope.nextSong = function() {
    mpdClient.stop();

    var songId = $scope.currentlyPlaying.next.id;

    console.log('Switching to song: ' + songId);

    mpdClient.removeSongFromQueueById( $scope.currentlyPlaying.id );

    growl.success("Next song requested"); 

    $timeout(function() {
      mpdClient.playById( songId );

      $scope.playState = 'play';      

      $scope.currentlyPlaying = mpdAssist.getPlaying(); 

      $scope.updateQueueLength(); 
    }, 900);
  }

  /**
  * Change the random playback status
  * 
  * @param boolean currentStatus
  */
  $scope.toggleRandom = function(currentStatus) {

    if (currentStatus) {

      mpdClient.enableRandomPlay();

      $scope.randomPlayback = true;
      growl.success("Random playback enabled"); 

    } else {

      mpdClient.disableRandomPlay();

      $scope.randomPlayback = false;
      growl.success("Random playback disabled"); 

    }

    var playbackSettings = {
        'random' : $scope.randomPlayback,
        'consume' : $scope.consumePlayback
    }

    window.localStorage['playback_settings'] = JSON.stringify(playbackSettings);     
  }

  /**
  * Change the consumption playback status
  *
  * @param boolean currentStatus  
  */
  $scope.toggleConsumption = function( currentStatus ) {

    if (currentStatus) {

      mpdClient.enablePlayConsume();

      $scope.consumePlayback = true;
      growl.success("Consumption playback enabled"); 

    } else {

      mpdClient.disablePlayConsume();

      $scope.consumePlayback = false;
      growl.success("Consumption playback disabled"); 

    }

    var playbackSettings = {
        'random' : $scope.randomPlayback,
        'consume' : $scope.consumePlayback
    }

    window.localStorage['playback_settings'] = JSON.stringify(playbackSettings);     
  }

  /**
  * Trigger an MPD refresh of the media store
  */
  $scope.refreshMedia = function() {

      mpdClient.updateDatabase();
      growl.success("Media store refresh triggered");

  }

  /**
  * Destroy the periodic process on state change
  */
  $scope.$on('$destroy', function() {

    $interval.cancel($scope.checkConnection);

  });

})

/**
* Browse and manage music files in the MPD servers filesystem
*/
.controller('FilesCtrl', function( $scope, $state, $stateParams, $anchorScroll, $location, $ionicHistory, $timeout, growl, mpdAssist) {
  var dirSeperator = "@!@";

  $scope.mpdConn = mpdAssist.checkConnection();
  $scope.directoryContents = {};
  $scope.directoryIndexes = false;
  $scope.homeButton = 0;

  /**
  * Scroll down the page to the selected element
  *
  * @param string elementId
  */
  $scope.scrollTo = function( elementId ) {

    $location.hash(elementId);

    $anchorScroll();

  }

  $scope.formatPath = function( filePath ) {

    return filePath.split("/").pop();

  }

  $scope.goBack = function() {

    $ionicHistory.goBack();

  };  

  if ($stateParams.param1 === 'root') {

    basePath = '/';

  } else {
    
    basePath = decodeURIComponent( $stateParams.param1 );

    // Replace the custom directory seperator as we cannot pass slashes via the URL
    var basePath = basePath.replace( dirSeperator, "/" );

    // Show a home button in the header if its not the root directory
    $scope.homeButton = 1;

  }

  $scope.dirData = mpdAssist.getDirectory(basePath);

  $scope.$watch('dirData', function ( dirData ) {

    $scope.directoryContents = dirData.directoryContents;

    // Only show the letter indexes in the root directory of the filesystem
    if ((!basePath) || (basePath === '/')) {

      $scope.directoryIndexes = dirData.directoryIndexes;  

    } else {

      $scope.directoryIndexes = false;

    }

  });

  $timeout(function(){

    if (!$scope.directoryContents) {

      console.log('Timeout trying to load directory contents, attempting reload');

      $state.go($state.current, {}, {reload: true});

    }

  }, 5000); 

  /**
  * Add all of the files for a directory to the queue
  *
  * @param dirPath
  */
  $scope.addDirectory = function( dirPath ) {

    var dirPath = dirPath.replace( decodeURIComponent(dirPath), "/" );

    growl.success("Directory added to play queue");

    mpdClient.addSongToQueueByFile(dirPath);

  }

  /**
  * Add a song to the play queue via its file path
  *
  * @param integer songPath
  */
  $scope.addSong = function( songPath ) {

    growl.success("Song added to play queue");

    mpdClient.addSongToQueueByFile(songPath);
  } 

  /**
  * Check if an object is empty
  *
  * @param object checkObj
  */
  $scope.isEmpty = function ( checkObj ) {

    for (var i in checkObj) {

      if (checkObj.hasOwnProperty(i)) {

        return false;

      } else {

        return true;

      }

    }

  };
 
})

/**
* Allow management of the current music playlist queue
*/
.controller('CurrentQueueCtrl', function( $scope, $interval, $timeout, growl, mpdAssist ) {
  $scope.playlistObj = {
    'loading' : true,
    'count' : 0,
    'songs' : {}
  };

  $scope.playQueue = function() {

    $scope.playlistObj.songs = mpdAssist.getQueue();

    $scope.playlistObj.count = $scope.playlistObj.songs.length;

    if ( $scope.playlistObj.loading ) {

      $scope.playlistObj.loading = false; 

    }

  }

  /**
  * Remove playlist item from the queue
  *
  * @param integer itemId
  * @param object playlistIndex
  */
  $scope.removePlaylistItem = function( itemId, playlistIndex ) {
    $scope.playlistObj.songs.splice(playlistIndex, 1);

    $scope.playlistObj.count--;

    $scope.playlistObj.loading = true;
    mpdClient.removeSongFromQueueByPosition(playlistIndex);

    growl.success("Song removed from the current play queue");
  }

  /**
  * Empty the current MPD play queue
  */
  $scope.wipePlaylist = function() {

    $scope.playlistObj.count = 0;
    $scope.playlistObj.songs = {};

    mpdClient.clearQueue(); 

    growl.success("The play queue has been cleared"); 
  }

  /**
  * Shuffle the contents of the MPD play queue
  */
  $scope.shuffleQueue = function() {

    mpdClient.shuffleQueue();

    $scope.playlistObj.songs = {};
    $scope.playlistObj.loading = true;  
    $scope.playlistObj.songs = mpdAssist.getQueue();

    growl.success("Shuffling the play queue contents"); 

  }

  /**
  * Start a song playing by its queue id
  *
  * @param integer songId
  * @param integer queueIndex
  */
  $scope.playSong = function(songId, queueIndex) {

    mpdClient.play(songId);

    $scope.playlistObj.songs[queueIndex].playing = 1;

    growl.success("Music playback started");  

  }

  /**
  * Stop a song playing by its queue id
  *
  * @param integer songId
  * @param integer queueIndex
  */
  $scope.stopSong = function(songId, queueIndex) {

    mpdClient.stop();

    $scope.playlistObj.songs[queueIndex].playing = 0;

  } 

  /**
  * Adding in slight delay before processing the queue, so it shows the loading message
  * rather than choking on the menu while it processes the playlist. As it makes most users
  * believe that the application has crashed with really large play queues.
  */
  $timeout(function() {

    $scope.updateQueue = $interval(function() {

      $scope.playQueue();

    }, 2000);

  }, 500);

  /**
  * Destroy the periodic process on state change
  */
  $scope.$on('$destroy', function() {

    $interval.cancel($scope.checkConnection);

  });  
})

/**
* Night mode is a cutback interface with a a black back ground to minimise glare from the screen
* when travelling at night.
*/
.controller('NightModeCtrl', function( $scope ) {

  $scope.leaveNight = function() {
    $scope.toggleNight(0);

    $scope.goHome();
  }

  /**
  * Toggle the status of night mode in the application settings object.
  * The purpose of having night mode persist is that it can be annoying when stopping for short periods petrol etc, starting the car and
  * have the application boot back into the default interface.
  *
  * @param integer nightStatus
  */
  $scope.toggleNight = function( nightStatus ) {
      var appSettings = $scope.appSettings;

      appSettings.night_mode = nightStatus;

      window.localStorage['app_settings'] = JSON.stringify(appSettings); 
  }

  $scope.toggleNight(1);

})

/**
* Show the playlists stored under MPD
*/
.controller('PlaylistsCtrl', function( $scope, growl, mpdAssist ) {

  $scope.storedPlaylists = '';

  mpdClient.lsPlaylists();

  $scope.PlaylistData = mpdClient.getPlaylists();

  $scope.$watch('PlaylistData', function (playlistData) {

    if (playlistData) {

      var storedPlaylists = playlistData;

      if (storedPlaylists.length > 0) {

        $scope.storedPlaylists = storedPlaylists;

      } else {

        $scope.storedPlaylists = false;

      }
    }
  });

  /**
  * Tell MPD to load the contents of a .m3u playlist file into the current play queue
  *
  * @param string playlistPath
  */
  $scope.loadPlaylist = function( playlistPath ) {

    mpdClient.loadPlaylistIntoQueue(playlistPath);

    growl.success("Playlist loaded to queue"); 

    // Get the play state if music is not already playing start the playlist
    var playState = mpdClient.getPlaystate();

    if ( playState === 'stop' ) {
      mpdClient.play();
    }    
  } 
})

/*
* Manage the weather forecast
*/
.controller('WeatherCtrl', function( $scope, $timeout, weatherAssist, gpsAssist ) {
  $weatherConditions = null;
  $scope.loadingData = true;
  $scope.locationInfo = false;
  $scope.errorMsg = null;

  if (parseInt($scope.appSettings.locationiq) === 1) {
    $scope.locationInfo = gpsAssist.locationInfo( $scope.gpsData.latitude, $scope.gpsData.longitude );
  }   

  /**
  * Get the appropriate icon for the weather conditions
  *
  * @param string urlPath
  *
  * @return string 
  */
  $scope.getIcon = function ( weatherType ) {
    return weatherAssist.getWeatherIcon( weatherType );
  }

  /**
  * Format the weather date
  *
  * @param string urlPath
  *
  * @return string 
  */
  $scope.reverseDate = function ( weatherDate ) {
    return weatherAssist.reverseDate( weatherDate );
  }

  var gpsData = window.localStorage['gps_data'];

  if (gpsData) {
    var gpsData = JSON.parse( gpsData );

    if (gpsData.latitude && gpsData.longitude) {

      $scope.weatherData = weatherAssist.getForecast( gpsData.latitude, gpsData.longitude );

      if (!$scope.weatherData) {
        $timeout(function(){
          $scope.weatherData = weatherAssist.getForecast( gpsData.latitude, gpsData.longitude );

          // Unable to get data throw an error
          if (!$scope.weatherData) {
            $scope.loadingData = false;
          }
        }, 8000); 
      }

    }
  } else {
    $scope.errorMsg = 'Unable to determine current location';
  }
})

/**
* Display the current location of the car on a map
*/
.controller('LocationCtrl', function( $scope, $interval, gpsAssist ) {
  $scope.areaMap = null;

  /**
  * Update the location of the car marker on the map
  */
  $scope.updateLocation = function() {
    $scope.locationInfo = false;

    if ($scope.gpsData.latitude && $scope.gpsData.longitude) {

      if (parseInt($scope.appSettings.locationiq) === 1) {
        $scope.locationInfo = gpsAssist.locationInfo( $scope.gpsData.latitude, $scope.gpsData.longitude );
      }

      $scope.areaMap = {
          center: {
              latitude: $scope.gpsData.latitude,
              longitude: $scope.gpsData.longitude
          },
          zoom: 16,
          id: 0
      }; 
    }   
  }

  // Update the current location of the car
  $interval(function() {

    $scope.updateLocation();

  }, 5000);

  $scope.updateLocation();  
})

/**
* Display the car trip meter
*/
.controller('TripMeterCtrl', function( $scope, $interval, contentFormatting, mpdAssist, gpsAssist, uiGmapGoogleMapApi ) {
  // Colour of the cars trip on the map
  var mapSettings = {
    "path_colour" : '#000',
    "path_weight" : 3
  }
  
  $scope.tripData = '';

  // Reset the stored trip data
  $scope.resetTrip = function() {

    $scope.tripData = '';
    window.localStorage['trip_data'] = '';

  }

  var tripData = window.localStorage['trip_data'];

  if (tripData) {

    // Create a URL obj allowing for downloading the current trip data points
    $scope.exportLink = window.URL.createObjectURL(
                                                    new Blob(
                                                              [tripData], 
                                                              {
                                                                type: "application/json"
                                                              }
                                                            )
                                                  );

    var tripData = JSON.parse(tripData);

    // If the trip is yet to contain any datapoints no point trying to continue any further
    if (typeof tripData.data_points == "undefined") {
      return;
    }

    var tripDetails = {
      "avg_speed" : 0,
      "avg_altitude" : 0,
      "altitude_points" : 0,
      "high_altitude" : 0,
      "trip_distance" : 0,
      "top_speed" : 0,
      "trip_log" : []
    }

      
    for (var i = 0; i < tripData.data_points.length; i++) { 
      if ( (typeof tripData.data_points[i].distance === 'number' ) ) {
        tripDetails.altitude_points++;
        tripDetails.trip_distance += parseFloat(tripData.data_points[i].distance);  

        tripDetails.trip_log.push(
                      {
                          latitude: tripData.data_points[i].lat,
                          longitude: tripData.data_points[i].long
                      }
                    );

        if (parseFloat(tripData.data_points[i].altitude) > 0) {
          tripDetails.avg_altitude += parseFloat(tripData.data_points[i].altitude);

          if ( tripDetails.high_altitude < parseFloat(tripData.data_points[i].altitude) ) {
            tripDetails.high_altitude = parseFloat(tripData.data_points[i].altitude);
          }          
        }

        if (typeof tripData.data_points[i].speed === 'number') {

          if ( tripDetails.top_speed < tripData.data_points[i].speed ) {
            tripDetails.altitude_points++;
            tripDetails.top_speed = tripData.data_points[i].speed;
          }

          tripDetails.avg_speed += parseFloat( tripData.data_points[i].speed );       
        } 

        tripData.data_points[i].altitude = parseFloat(tripData.data_points[i].altitude);

        tripDetails.avg_speed += parseFloat( tripData.data_points[i].speed );       
      }    
    }

    $scope.tripDetails = {
      "avg_altitude" : Math.round(tripDetails.avg_altitude / tripDetails.altitude_points),
      "trip_distance" : Math.round(tripDetails.trip_distance),
      "avg_speed" : Math.round(tripDetails.trip_distance / parseFloat(tripData.time / 1000 / 60) * 60),
      "top_speed" : tripDetails.top_speed,
      "high_altitude" : tripDetails.high_altitude,
      "trip_time" : contentFormatting.formatTripTime( tripData.time / 1000 )
    }

    // Only show a map if we have gone at least 1km
    if ( tripDetails.trip_distance < 1 ) {
      return;
    }

    var lastPos = {
                    lat : tripData.data_points[tripDetails.trip_log.length-1].lat,
                    long : tripData.data_points[tripDetails.trip_log.length-1].long
                  }

    // Calculate the optimum zoom level given the distance traversed
    var mapZoom = gpsAssist.getMapZoom( lastPos.lat , tripDetails.trip_distance );

    $scope.tripMap = {
                        center: {
                                  latitude: lastPos.lat, 
                                  longitude: lastPos.long 
                                }, 
                        zoom: mapZoom, 
                        bounds: {}
                     };

    $scope.polylines = [];

    uiGmapGoogleMapApi.then(function(){

      $scope.polylines = [
          {
              id: 'carTrip',
              path: tripDetails.trip_log,
              stroke: {
                  color: mapSettings.path_colour,
                  weight: mapSettings.path_weight
              },
              editable: false,
              draggable: false,
              geodesic: true,
              visible: true,
              static: false,
              icons: [{
                  icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
                  },
                  offset: '25px',
                  repeat: '50px'
              }]
          }
        ];
      });

    $scope.tripData = tripData;
  }
})

/*
* Static page with links to external resources out of the application 
* i.e maps, car workshop manuals etc
*/
.controller('ReferenceCtrl', function( $scope ) {

  /**
  * Open a file with the external system handler
  *
  * @param string externalLink
  */
  $scope.openExtFile = function openExternal( externalLink ) {
    window.open(externalLink, "_system");

    return false; 
  }
})

/*
* Page for controllling application settings such as the preferred unit for speed, distance, temperature etc.
*/
.controller('SettingsCtrl', function( $scope ) {
  
  /**
  * Update the value for an applications setting
  *
  * @param integer appSettings
  */
  $scope.saveValue = function( appSettings ) {

    window.localStorage['app_settings'] = JSON.stringify(appSettings);
  }

})