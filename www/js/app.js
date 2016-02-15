mpdClient = MPD(8800);

/**
* Car Computer AngularJS Application
**/
angular.module(
                'landcruiser', 
                [
                  'ionic', 
                  'landcruiser.controllers', 
                  'landcruiser.sound',
                  'gpsAssist',
                  'weatherAssist',
                  'elif',
                  'ImgCache',
                  'angular-growl'
                ]
              )

.run(function($ionicPlatform, ImgCache) {
  $ionicPlatform.ready(function() {
    ImgCache.$init();
  });
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, ImgCacheProvider, growlProvider) {
  $stateProvider

    .state('app', {
      url: '/app',
      abstract: true,
      templateUrl: 'templates/menu.html',
      controller: 'AppCtrl'
    })

    .state('app.home', {
      url: '/home',
      views: {
        'menuContent' :{
          templateUrl: 'templates/home.html',
          controller: 'HomeCtrl'
        }
      },
      cache: false
    })

    .state('app.files', {
      url: '/music-files/:param1',
      views: {
        'menuContent' :{
          templateUrl: 'templates/files.html',
          controller: 'FilesCtrl'
        }
      },
      cache: false      
    })

    .state('app.night', {
      url: '/night-mode',
      views: {
        'menuContent' :{
          templateUrl: 'templates/night-mode.html',
          controller: 'NightModeCtrl'
        }
      },
      cache: false      
    })

    .state('app.playlists', {
      url: '/playlists',
      views: {
        'menuContent' :{
          templateUrl: 'templates/playlists.html',
          controller: 'PlaylistsCtrl'
        }
      },
      cache: false      
    })

    .state('app.current-queue', {
      url: '/current-queue',
      views: {
        'menuContent' :{
          templateUrl: 'templates/current-queue.html',
          controller: 'CurrentQueueCtrl'
        }
      },
      cache: false
    })

    .state('app.weather', {
      url: '/weather',
      views: {
        'menuContent' :{
          templateUrl: 'templates/weather.html',
          controller: 'WeatherCtrl'
        }
      }
    })

    .state('app.reference', {
      url: '/reference',
      views: {
        'menuContent' :{
          templateUrl: 'templates/reference.html',
          controller: 'ReferenceCtrl'
        }
      }
    })

  // Default route (used as a fallback should the request not match any of the defined routes)
  $urlRouterProvider.otherwise('/app/home');

  // set single options
  ImgCacheProvider.setOption('debug', true);
  ImgCacheProvider.setOption('usePersistentCache', true);

  // or more options at once
  ImgCacheProvider.setOptions({
      debug: true,
      usePersistentCache: true
  });

  // ImgCache library is initialized automatically,
  // but set this option if you are using platform like Ionic -
  // in this case we need init imgcache.js manually after device is ready
  ImgCacheProvider.manualInit = true;  

  /**
  * Disable the page transistions
  */
  $ionicConfigProvider.views.transition('none');
  $ionicConfigProvider.scrolling.jsScrolling(false);
  
  // Set a global timeout on notification messages
  growlProvider.globalTimeToLive(1200);
  growlProvider.globalDisableCountDown(true);
  growlProvider.globalPosition('bottom-center');
  growlProvider.onlyUniqueMessages(false);
});