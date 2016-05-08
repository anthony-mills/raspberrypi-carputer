angular.module('landcruiser.controllers', [])

.controller('AppCtrl', function( $scope, $interval, gpsAssist, contentFormatting ) {

  /**
  * Get the GPS data from GPSD for the location panel
  *
  * Default frequency is every second. The interval can prbably be increased for a more responsive speed readout on systems using a Raspberry Pi Model 3
  */
  var updateFrequency = 1000;
  $scope.currentDate = contentFormatting.getTime();

  $scope.gpsData = {}

  $scope.getGPS = $interval(function() {

    // Update the current tiem / Data
    $scope.currentDate = contentFormatting.getTime();

    gpsAssist.getLocationData().then(function(gpsData) {
      
      if ((gpsData.latitude != 'Unknown') && (gpsData.longitude !='Unknown')) {
          window.localStorage['gps_data'] = JSON.stringify( gpsData ); 

          gpsAssist.updateTrip( gpsData, updateFrequency );
      }
      $scope.gpsData = gpsData;
    });
  }, updateFrequency);
})

/**
* Manage the connection to the MPD instance 
* and display main application navigation.
*/
.controller('HomeCtrl', function( $scope, $interval, $timeout, growl, mpdAssist, contentFormatting) {
  $scope.playlistCount = 0;
  $scope.mpdStatus = "Not connected";
  $scope.currentlyPlaying = false;

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
          if ( ( $scope.playState === 'play' ) && ( nowPlaying.playTime.raw > 0) && (nowPlaying.playTime.raw < nowPlaying.duration.raw)) {
            
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
  * Paused the music
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
    var songId = $scope.currentlyPlaying.next.id;

    console.log('Switching to song: ' + songId);

    mpdClient.stop();
    mpdClient.removeSongFromQueueById( $scope.currentlyPlaying.id );
    mpdClient.playById( songId );

    $scope.playState = 'play';

    $scope.updateQueueLength(); 
    growl.success("Next song requested"); 

    $timeout(function() {
      $scope.currentlyPlaying = mpdAssist.getPlaying(); 
    }, 800);
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
  $scope.toggleConsumption = function(currentStatus) {

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

  $scope.scrollTo = function( id ) {

    $location.hash(id);

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

    basePath = $stateParams.param1;
    
    basePath = decodeURIComponent(basePath);

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

    var dirPath = decodeURIComponent(dirPath);
    var dirPath = dirPath.replace( dirSeperator, "/" );    

    growl.success("Directory added to play queue");

    mpdClient.addSongToQueueByFile(dirPath);

  }

  /**
  * Add a song to the play queue via its file path
  *
  * @param integer songPath
  */
  $scope.addSong = function( songPath ) {

    console.log('Added song to playlist: ' + songPath);

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

  $scope.playlistSongs = {};
  $scope.playlistCount = 0;
  $scope.playlistLoading = true;  

  $scope.playQueue = function() {

    $scope.playlistSongs = mpdAssist.getQueue();
    $scope.playlistCount = $scope.playlistSongs.length;

    if ( $scope.playlistLoading ) {

      $scope.playlistLoading = false; 

    }

  }

  /**
  * Remove playlist item from the queue
  *
  * @param integer itemId
  * @param object playlistIndex
  */
  $scope.removePlaylistItem = function( itemId, playlistIndex ) {
    $scope.playlistSongs.splice(playlistIndex, 1);
    $scope.playlistCount--;

    $scope.playlistLoading = true;
    mpdClient.removeSongFromQueueByPosition(playlistIndex);

    growl.success("Song removed from play queue");
  }

  /**
  * Empty the current MPD play queue
  */
  $scope.wipePlaylist = function() {

    $scope.playlistCount = 0;
    $scope.playlistSongs = [];

    mpdClient.clearQueue(); 

    growl.success("Play queue cleared"); 

    $scope.playlistSongs = {};
    $scope.playlistCount = 0;

  }

  /**
  * Shuffle the contents of the MPD play queue
  */
  $scope.shuffleQueue = function() {

    mpdClient.shuffleQueue();

    $timeout(function() {

      console.log('Refreshing play queue');
      
      $scope.playQueue();

    }, 5000);

    growl.success("Play queue contents shuffled"); 

  }

  /**
  * Start a song playing by its queue id
  *
  * @param integer songId
  * @param integer queueIndex
  */
  $scope.playSong = function(songId, queueIndex) {

    console.log('Starting playback of track: ' + songId);
    mpdClient.play(songId);

    $scope.playlistSongs[queueIndex].playing = 1;
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
    $scope.playlistSongs[queueIndex].playing = 0;

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
.controller('NightModeCtrl', function( $scope ) {})

/**
* Show the playlists stored under MPD
*/
.controller('PlaylistsCtrl', function( $scope, growl, mpdAssist ) {

  $scope.storedPlaylists = '';

  mpdClient.lsPlaylists();

  $scope.PlaylistData = mpdClient.getPlaylists();
  $scope.$watch('PlaylistData', function (playlistData) {

    if (playlistData) {
      console.log(playlistData);
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
  } 
})

/*
* Manage the weather forecast
*/
.controller('WeatherCtrl', function($scope, weatherAssist) {
  $weatherConditions = null;

  $scope.getIcon = function ( urlPath ) {
    return weatherAssist.getWeatherIcon( urlPath );
  }

  var gpsData = window.localStorage['gps_data'];

  if (gpsData) {
    var gpsData = JSON.parse( gpsData );
    
    if (gpsData.latitude && gpsData.longitude) {
      $scope.weatherData = weatherAssist.getForecast( gpsData.latitude, gpsData.longitude );
    }
  }
})

/**
* Display the current location of the car on a map
*/
.controller('LocationCtrl', function($scope, $interval, contentFormatting) {
  $scope.areaMap = null;

  /**
  * Update the location of the car marker on the map
  */
  $scope.updateLocation = function() {
    var gpsData = window.localStorage['gps_data'];

    if (gpsData) {
      var gpsData = JSON.parse( gpsData );

      if (gpsData.latitude && gpsData.longitude) {

        $scope.areaMap = {
            center: {
                latitude: gpsData.latitude,
                longitude: gpsData.longitude
            },
            zoom: 16,
            id: 0
        }; 
         
      }
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

    // If the trip is yet to contain any datapoints don't try and continue any further
    if (typeof tripData.data_points == "undefined") {
      return;
    }

    tripData.time = contentFormatting.formatSeconds( tripData.time / 1000 )

    var avgSpeed = 0;
    var avgAltitude = 0;
    var tripDistance = 0;
    var topSpeed = 0; 
    var carLog = [];
    
    for (var i = 0; i < tripData.data_points.length; i++) { 

      if (tripData.data_points[i].distance > 0) {
        tripDistance += parseInt(tripData.data_points[i].distance);  

        carLog.push(
                      {
                          latitude: tripData.data_points[i].lat,
                          longitude: tripData.data_points[i].long
                      }
                    );

        avgAltitude += parseInt(tripData.data_points[i].altitude);

        if (typeof tripData.data_points[i].speed == 'number') {
          avgSpeed += parseInt(tripData.data_points[i].speed);       
        } 
      }    
    }

    $scope.avgAltitude = Math.round(avgAltitude / carLog.length);
    $scope.avgSpeed = Math.round(avgSpeed / carLog.length);   
    $scope.tripDistance = Math.round(tripDistance);

    if (tripData.top_speed) {

      $scope.topSpeed = tripData.top_speed;

    }

    if (tripData.highest_altitude) {

      $scope.highest_altitude = tripData.highest_altitude;

    }

    // Only show a map if we have gone at least 1km
    if ( tripDistance < 1 ) {
      return;
    }

    var lastPos = {
                    lat : tripData.data_points[carLog.length-1].lat,
                    long : tripData.data_points[carLog.length-1].long
                  }

    // Calculate the optimum zoom level given the distance traversed
    var mapZoom = gpsAssist.getMapZoom( lastPos.lat , tripDistance );

    $scope.tripMap = {
                        center: {
                                  latitude: lastPos.lat, 
                                  longitude: lastPos.long 
                                }, 
                        zoom: mapZoom, 
                        bounds: {}
                     };

    console.log($scope.tripMap);

    $scope.polylines = [];

    uiGmapGoogleMapApi.then(function(){

      $scope.polylines = [
          {
              id: 'carTrip',
              path: carLog,
              stroke: {
                  color: '#000',
                  weight: 3
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
* Static page with external links out of the application 
* to static resource files.
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