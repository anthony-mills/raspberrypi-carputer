angular.module('landcruiser.sound', [])

/**
 * Service providing playback and mpd queue functionality 
 */
.factory('mpdAssist', function($http, $log, $rootScope, $q) {

	/**
	* Check if the system is connected to the MPD instance
	*
	* @return integer
	*/
	function checkConnection()
	{
	    var mpdState = mpdClient.getState();

	    if (mpdState.connected) {
	    	return 1;
	    } else {
	    	return 0;
	    }		
	}

	/**
	* Get details about the currently playing song
	* 
	*/
	function getPlaying()
	{
		var currentSong = mpdClient.getCurrentSong();

		if (currentSong) {
			var songArtist = currentSong.getArtist();
			var albumArt = findAlbumArt(songArtist, 'feature');
			var trackMetadata = currentSong.getMetadata()
			var songObj = {
	            'id' :  currentSong.getId(),
	            'name' :  currentSong.getDisplayName(),
	            'playTime' : {
	            				'formatted': formatSeconds(mpdClient.getCurrentSongTime()),
	            				'raw': mpdClient.getCurrentSongTime()
	            			},   	            
	            'duration' : {
	            				'formatted': formatSeconds(currentSong.getDuration()),
	            				'raw': currentSong.getDuration() 
	            			},    				
	            'artist' : songArtist,
	            'album' : currentSong.getAlbum(),
	            'year' : trackMetadata.date,
	            'image' : albumArt,
				'next' : false,
				'paused' : 0
	        }

	        var nextSong = mpdClient.getNextSong();

	        if (nextSong) {

	        	var albumArt = findAlbumArt(nextSong.getArtist());
				var nextSongObj = {
		            'id' :  nextSong.getId(),
		            'name' :  nextSong.getDisplayName(),
		            'duration' : formatSeconds(nextSong.getDuration()),
		            'artist' : nextSong.getArtist(),
		            'album' : nextSong.getAlbum(),
		            'queueid' : nextSong.getQueuePosition(),
		            'image' : albumArt
		        }	

		        songObj.next = nextSongObj;
	        }
	        return songObj;
		}
		
	}

	/**
	* Format a song duration from seconds
	*
	* @param integer timeSeconds
	* @return string playTime
	*/
	function formatSeconds( timeSeconds )
	{
	    var date = new Date(1970,0,1);
	    date.setSeconds(timeSeconds);
	    var playTime = date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

	    if (playTime.substring(0, 3) == '00:') {
			var playTime = playTime.substring(3);
	    }

	    return playTime;
	}

	/**
	* Find the album art for an artist
	*
	* @param string artistName
	*/
	function findAlbumArt( artistName, imageSize ) 
	{	     	
        if (typeof artistName === 'undefined'){

          var albumArt = '/img/no_image.png';

        } else {
	        var artistSlug = artistName.toLowerCase(artistName.replace(/\W/g, ''));      	

	        var artworkStore = window.localStorage['album_art'];
	   
	        if (artworkStore) {

	            var artworkStore = JSON.parse(artworkStore);
     			
	            if (typeof artworkStore[artistSlug] === 'undefined') {
					getAlbumArt(artistName).then(function(res){
					  var results = res.data.results.pop();

					  addAlbumArt(artistSlug, results.artworkUrl100);
					});	            
						
	            } else {
	            	var artistCover = artworkStore[artistSlug];

	            	if (imageSize) {
		            	switch (imageSize) {
		            		case 'original':
		            			var albumArt = artistCover.original;
		            		break;

		            		case 'feature':
		            			var albumArt = artistCover.feature;
		            		break;

		            		case 'big':
		            			var albumArt = artistCover.big;
		            		break;

		            		default:
		            			var albumArt = artistCover.original;
		            	}	            		
	            	} else {
	            		var albumArt = artistCover.original;
	            	}


	            }
	        } else {
				getAlbumArt(artistName).then(function(res){
				  var results = res.data.results.pop();

				  addAlbumArt(artistSlug, results.artworkUrl100);
				});	 	        	
	        } 
		}
			
		if (typeof albumArt === 'undefined') {
			var albumArt = '/img/no_image.png';
		}	
		
        return albumArt;
	}

	/**
	* Get the album art for a artist
	*
	* @param string artistName
	*/	
	function getAlbumArt( artistName )
	{

		var url = 'https://itunes.apple.com/search?term=' + artistName + '&limit=1&media=music&entity=musicArtist,album' + '&callback=JSON_CALLBACK';
		console.log('Trying to find image for:' + url);

	   	return $http({
	   	  	method: 'JSONP',
	   	  	url: url
	   	})
	}

	/**
	* Add the url for an artists album image to the 
	* local storage cache
	*
	* @param string artistName
	* @param string imageUrl
	*/	
	function addAlbumArt( artistSlug, imageUrl )
	{
		if (imageUrl) {
	        var albumArt = window.localStorage['album_art'];

	        if (albumArt) {
	            var albumArt = JSON.parse(albumArt);
	        } else {
	        	var albumArt = {};
	        }

	        var bigImage = imageUrl.replace("100x100", "200x200");
	        var featureImage = imageUrl.replace("100x100", "150x150");        

	        albumArt[artistSlug] = {
	        	'original' : imageUrl,
	        	'feature' : featureImage,
	        	'big' : bigImage
	        };

			window.localStorage['album_art'] = JSON.stringify(albumArt);
		}
	}

	/**
	* Find playlists within a directory
	* MPD filesystem
	*
	* @param string dirPath
	* 
	* @return object directoryPlaylists	
	*/	
	function getDirectoryPlaylists( dirPath )
	{
		var directoryPlaylists = [];

		mpdClient.getDirectoryContents(dirPath, function(directoryFiles){

			directoryFiles.forEach(function(directoryItem){
				var metaData = directoryItem.getMetadata();

				if ((typeof metaData.playlist != 'undefined')) {
					if (metaData.playlist.includes("xspf")) {

						var itemData = {
							'type' : 'playlist',
							'name' : metaData.playlist.replace(".xspf", ""),
							'path' : metaData.playlist
						}			

						directoryPlaylists.push(itemData);
					}
				} 
			});
    	});

		console.log(directoryPlaylists);

		return directoryPlaylists;
	}

	/**
	* Get the contents of a directory on the 
	* MPD filesystem
	*
	* @param string dirPath
	* 
	* @return object directoryContents
	*/	
	function getDirectory( dirPath )
	{
		var directoryContents = [];

		mpdClient.getDirectoryContents(dirPath, function(directoryFiles){

			directoryFiles.forEach(function(directoryItem){
				var metaData = directoryItem.getMetadata();
				console.log(metaData);
				if ((typeof metaData.directory === 'undefined') && (typeof metaData.playlist === 'undefined')) {
					var objPath = directoryItem.getPath();

					if (typeof objPath != 'undefined') {
						
						var albumArt = findAlbumArt(directoryItem.getArtist());

						var itemData = {
							'type' : 'file',
							'path' : objPath,
							'artist' : directoryItem.getArtist(),
							'album' : directoryItem.getAlbum(),
							'track' : directoryItem.getTrack(),
							'duration' : formatSeconds(metaData.time),
							'artwork' : albumArt
						}
						//console.log(itemData);
					}
				} else {
					var objPath = directoryItem.getPath();

					if (typeof objPath != 'undefined') {					
						var itemData = {
							'type' : 'directory',
							'path' : objPath,
							'link' : encodeURIComponent(objPath.replace("/", "@!@")),
							'artwork' : '/img/folder.png'
						}
					}
				}

				directoryContents.push(itemData);
			});
    	});

		return directoryContents;
	}

	/**
	* Get the contents of the current play queue
	*
	* @return array playlistSongs
	*/
	function getQueue()
	{
		var mpdQueue = mpdClient.getQueue();
		var playlistSongs = [];
		var currentSong = mpdClient.getCurrentSongID();

	  	if (mpdQueue) {
			playlistPostition = 0;
	    	mpdQueue.getSongs().forEach(function(playlistSong){
	        	var songArtist = playlistSong.getArtist();

				if ((currentSong === playlistSong.getId()) && (mpdClient.getCurrentSongTime() > 0) && (mpdClient.getCurrentSongTime() < playlistSong.getDuration())) {
					var songStatus = 1;
				} else {
					var songStatus = 0;
				}

				var albumArt = findAlbumArt(songArtist);

				var songObj = {
		            'id' :  playlistSong.getId(),
					'position' : playlistPostition,
		            'name' :  playlistSong.getDisplayName(),
		            'duration' : formatSeconds(playlistSong.getDuration()),
		            'artist' : songArtist,
		            'album' : playlistSong.getAlbum(),
		            'image' : albumArt,
					'playing' : songStatus,
					'playTime' : 0
		        }

		        if (songStatus === 1) {
		        	songObj.playTime = formatSeconds(mpdClient.getCurrentSongTime());
		        }

		        playlistSongs.push(songObj);

				playlistPostition++;
	    	});

		}

		return playlistSongs;
	}

	return {
		checkConnection: function() {
			
			return checkConnection();
		},
	    formatSeconds: function( songDuration ) {

			return formatSeconds(songDuration);
	    },

		getDirectory: function( dirPath ) {

	       return getDirectory(dirPath);
	    },

		getDirectoryPlaylists: function( dirPath ) {

	       return getDirectoryPlaylists(dirPath);
	    },

		getQueue: function() {

	       return getQueue();
	    },

	    getPlaying: function() {

	    	return getPlaying();
	    },

	    addAlbumArt: function( artistName, imageUrl ) {

	       return addAlbumArt(artist, image);
	    },

	    checkAlbumArt: function( artistName ) {

	       return checkAlbumArt(artist);
	    },

	    getAlbumArt: function( artistName ) {

	       return getAlbumArt(artist);
	    }
	}
});