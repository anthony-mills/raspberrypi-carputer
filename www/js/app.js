mpdClient = MPD(8800);

/**
* Car Computer AngularJS Application
**/
angular.module(
                'carcomputer', 
                [
                  'ionic', 
                  'controllers', 
                  'sound',
                  'gpsAssist',
                  'weatherAssist',
                  'contentFormatting',
                  'elif',
                  'ImgCache',
                  'angular-growl',
                  'nemLogging',
                  'uiGmapgoogle-maps',
                  'FBAngular'
                ]
              )

.run(function($ionicPlatform, ImgCache) {
  $ionicPlatform.ready(function() {
    ImgCache.$init();
  });
})

.run(function($rootScope, $location) {

  // Global function for returning a user to the application home page  
  $rootScope.goHome = function() {
    $location.path('/');
  };
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $compileProvider, ImgCacheProvider, growlProvider) {
  $stateProvider

    // Handler for the side menu
    .state('app', {
      url: '/app',
      abstract: true,
      templateUrl: 'templates/partials/menu.html',
      controller: 'AppCtrl'
    })

    // Default application home page
    .state('app.home', {
      url: '/home',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/home.html',
          controller: 'HomeCtrl'
        }
      },
      cache: false
    })

    // Navigation the MPD filesystem
    .state('app.files', {
      url: '/music-files/:param1',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/files.html',
          controller: 'FilesCtrl'
        }
      },
      cache: false      
    })

    // Switch to darkened "night mode" view
    .state('app.night', {
      url: '/night-mode',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/night-mode.html',
          controller: 'NightModeCtrl'
        }
      },
      cache: false      
    })

    // List the predefined MPD playlists
    .state('app.playlists', {
      url: '/playlists',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/playlists.html',
          controller: 'PlaylistsCtrl'
        }
      },
      cache: false      
    })

    // Show the current play queue
    .state('app.current-queue', {
      url: '/current-queue',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/current-queue.html',
          controller: 'CurrentQueueCtrl'
        }
      },
      cache: false
    })

    // Get a weather forecast for the current location
    .state('app.weather', {
      url: '/weather',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/weather.html',
          controller: 'WeatherCtrl'
        }
      }
    })

    // Show the current location of the car
    .state('app.location', {
      url: '/car-location',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/car-location.html',
          controller: 'LocationCtrl'
        }
      }
    })

    // Map the current car trip 
    .state('app.trip-meter', {
      url: '/trip-meter',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/trip-meter.html',
          controller: 'TripMeterCtrl'
        }
      }
    })

    // Reference materials page
    .state('app.reference', {
      url: '/reference',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/reference.html',
          controller: 'ReferenceCtrl'
        }
      }
    })

    // Application settings page
    .state('app.settings', {
      url: '/settings',
      views: {
        'menuContent' :{
          templateUrl: 'templates/pages/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })

  // Default route (used as a fallback should the request not match any of the defined routes)
  $urlRouterProvider.otherwise('/app/home');

  // Set options for the ImgCache module
  ImgCacheProvider.setOptions({
      debug: false,
      usePersistentCache: true
  });

  ImgCacheProvider.manualInit = true;  

  $compileProvider.aHrefSanitizationWhitelist(/^s*(https?|ftp|blob|mailto|chrome-extension):/);

  /**
  * Disable the page transistions
  */
  $ionicConfigProvider.views.transition('none');
  $ionicConfigProvider.scrolling.jsScrolling(false);
  
  $ionicConfigProvider.navBar.alignTitle('center');

  // Disable angular ng-scope and isolate scope classes see https://medium.com/@hackupstate/improving-angular-performance-with-1-line-of-code-a1fb814a6476#.3a2pttrtc
  $compileProvider.debugInfoEnabled(false);
  
  // Set a global timeout on notification messages
  growlProvider.globalTimeToLive(2000);
  growlProvider.globalDisableCountDown(true);
  growlProvider.globalPosition('bottom-center');
  growlProvider.onlyUniqueMessages(false);
});