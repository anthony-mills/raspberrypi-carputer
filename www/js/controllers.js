angular.module('landcruiser.controllers', [])

.controller('AppCtrl', function( $scope, $interval, gpsAssist ) {
  // Get the GPS data from GPSD for the location panel
  $scope.gpsData = {}

  $scope.getGPS = $interval(function() {
    gpsAssist.startGPS().then(function(gpsData) {

      if ((gpsData.latitude != 'Unknown') && (gpsData.longitude !='Unknown')) {
          window.localStorage['gps_data'] = JSON.stringify( gpsData );  
      }
      $scope.gpsData = gpsData;
    });
  }, 1000);
})

/**
* Manage the connection to the MPD instance 
* and display main application navigation.
*/
.controller('HomeCtrl', function( $scope, $interval, $timeout, growl, mpdAssist) {
  $scope.playlistCount = 0;

  $scope.mpdStatus = "Not connected";
  $scope.currentlyPlaying = false;
  $scope.currentDate = '';
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
    $scope.getTime();

    var mpdState = mpdClient.getState();    

    $scope.playState = mpdClient.getPlaystate();

    if (mpdState.connected) {
      $scope.mpdStatus = "Connected";

      if (!$scope.playlistCount) {
        // Get the number of songs in the playlist
        $scope.updateQueueLength(); 
      }

      if ( $scope.playState === 'stop' || $scope.playState === 'pause' ) {
        return;
      }

      if ( $scope.playState === 'play') {
          if (typeof $scope.currentlyPlaying == "object") {
            var nowPlaying =  $scope.currentlyPlaying;
          } else {
            var nowPlaying = mpdAssist.getPlaying(); 
          }

          if ( ( $scope.playState === 'play' ) && ( nowPlaying.playTime.raw > 0) && (nowPlaying.playTime.raw < nowPlaying.duration.raw)) {
            
            nowPlaying.playTime.raw++;

            nowPlaying.playTime.formatted = mpdAssist.formatSeconds( nowPlaying.playTime.raw );

            $scope.currentlyPlaying = nowPlaying;
          } else if ( ( $scope.playState === 'play' ) && ($scope.currentlyPlaying.playTime.formatted === $scope.currentlyPlaying.duration.formatted)) {

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

  $scope.getTime = function formatAMPM() {
    var d = new Date(),
        minutes = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes() : d.getMinutes(),
        hours = d.getHours().toString().length == 1 ? '0'+d.getHours() : d.getHours(),
        ampm = d.getHours() >= 12 ? 'pm' : 'am',
        months = [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December'
                  ],
        days = [
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday'
                ];

    var monthDate = $scope.formatDate( d.getDate() );

    $scope.currentDate = days[d.getDay()] + ' ' + 
                          monthDate + ' ' + 
                          months[d.getMonth()] + ' ' + 
                          d.getFullYear() + ' - ' + 
                          hours + ':' + minutes + ampm;
  }

  $scope.formatDate = function(number) {
    number = Number(number);

    if(!number || (Math.round(number) !== number)) {
      return number;
    }
    var signal = (number < 20) ? number : Number(('' + number).slice(-1));

    switch(signal) {
      case 1:
        return number + 'st'
      case 2:
        return number + 'nd'
      case 3:
        return number + 'rd'
      default:
        return number + 'th'
    }
  }

  /**
  * Paused the music
  *
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

  // Update the number of items in the playlist
  $scope.updateQueueLength = function() {
    var playlistSongs = mpdAssist.getQueue();
    $scope.playlistCount = playlistSongs.length; 
  }

  /**
  * Stop the music
  *
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
.controller('FilesCtrl', function( $scope, $state, $stateParams, $ionicHistory, $timeout, growl, mpdAssist) {
  $scope.mpdConn = mpdAssist.checkConnection();
  $scope.directoryContents = {};
  $scope.homeButton = 0;

  $scope.goBack = function() {
    $ionicHistory.goBack();
  };  

  $scope.formatPath = function (directoryPath) {
    return directoryPath.replace(/\//g, '<br />');
  }

  if ($stateParams.param1 === 'root') {
    basePath = '/';
  } else {
    basePath = $stateParams.param1;
    
    basePath = decodeURIComponent(basePath);
    var basePath = basePath.replace("@!@", "/");

    // Show a home button in the header if its not the root directory
    $scope.homeButton = 1;
  }
  console.log('Getting path:' + basePath);
  $scope.dirData = mpdAssist.getDirectory(basePath);

  $scope.$watch('dirData', function (dirData) {
    $scope.directoryContents = dirData;
  });

  $timeout(function(){
    if (!$scope.directoryContents) {
      console.log('Timeout: reloading!');
      $state.go($state.current, {}, {reload: true});
    }
  }, 2000); 

  /**
  * Add all of the files living under a playlist to the queue
  *
  */
  $scope.addDirectory = function(dirPath) {
    var dirPath = decodeURIComponent(dirPath);
    var dirPath = dirPath.replace("@!@", "/");    

    growl.success("Directory added to play queue");

    mpdClient.addSongToQueueByFile(dirPath);

  }

  /**
  * Add a song by its queue id
  *
  * @param integer songPath
  */
  $scope.addSong = function(songPath) {
    console.log('Added song to playlist: ' + songPath);

    growl.success("Song added to play queue");
    mpdClient.addSongToQueueByFile(songPath);
  } 

  /**
  * Check if an object is empty
  */
  $scope.isEmpty = function (obj) {
      for (var i in obj) if (obj.hasOwnProperty(i)) return false;
      return true;
  };
 
})

/**
* Allow management of the current music playlist queue
*/
.controller('CurrentQueueCtrl', function( $scope, $interval,$timeout, growl, mpdAssist ) {

  $scope.playlistSongs = {};
  $scope.playlistCount = 0;
  $scope.playlistLoading = true;  

  $scope.playQueue = function() {
    $scope.playlistSongs = mpdAssist.getQueue();
    $scope.playlistCount = $scope.playlistSongs.length;

    if ($scope.playlistLoading) {
      $scope.playlistLoading = false; 
    }
  }

  $scope.removePlaylistItem = function(itemId, playlistIndex) {
    $scope.playlistSongs.splice(playlistIndex, 1);
    $scope.playlistCount--;

    console.log('Remove song from playlist:' + itemId);

    $scope.playlistLoading = true;
    mpdClient.removeSongFromQueueByPosition(playlistIndex);

    growl.success("Song removed from play queue");
  }

  $scope.wipePlaylist = function() {
    $scope.playlistCount = 0;
    $scope.playlistSongs = [];
    mpdClient.clearQueue(); 

    growl.success("Play queue cleared"); 

    $scope.playlistSongs = {};
    $scope.playlistCount = 0;
  }

  $scope.shuffleQueue = function() {
    mpdClient.shuffleQueue();

    $timeout(function() {
      $scope.playQueue();
    }, 800);

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
    console.log('Stopping playback of track: ' + songId);
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
.controller('NightModeCtrl', function( $scope ) {

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
      console.log(playlistData);
      var storedPlaylists = playlistData;

      if (storedPlaylists.length > 0) {
        $scope.storedPlaylists = storedPlaylists;
      } else {
        $scope.storedPlaylists = false;
      }
    }
  });

  $scope.loadPlaylist = function(playlistPath) {
    console.log("Adding playlist " + playlistPath + " to the play queue.");

    mpdClient.loadPlaylistIntoQueue(playlistPath);

    growl.success("Playlist loaded to queue"); 
  } 
})

/*
* Manage the weather forecast
*/
.controller('WeatherCtrl', function($scope, weatherAssist) {
  $weatherConditions = null;

  var gpsData = window.localStorage['gps_data'];

  if (gpsData) {
    var gpsData = JSON.parse( gpsData );
    
    if (gpsData.latitude && gpsData.longitude) {
      $scope.weatherData = weatherAssist.getForecast( gpsData.latitude, gpsData.longitude );
    }
  }
})

/*
* Display the car location
*/
.controller('LocationCtrl', function($scope, $interval, weatherAssist) {
  $scope.areaMap = null;

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

  $interval(function() {
    $scope.updateLocation();
  }, 5000);

  $scope.updateLocation();  
})

/*
* Static page with external links out of the application 
* to static resource files.
*/
.controller('ReferenceCtrl', function($scope) {
  $scope.openExtFile = function openExternal(externalLink) {
    window.open(externalLink, "_system");

    return false; 
  }
})