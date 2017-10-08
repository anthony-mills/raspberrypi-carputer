/**
 * The global MPD function is the main interface and only global varialbe of the MPD.js library.
 * This function returns an object representing an MPD web client.
 * All other methods documented here are member functions of the object returned by a call to the MPD function.
 *
 * @example
 * //EXAMPLE USAGE//
 * //retrives a MPD client interface on port 8800
 * var mpd_client = MPD(8800);
 * //set handler for when the state changes
 * mpd_client.on('StateChanged', updateUiFunction);
 * @class
 * @param {Integer} [_port] - the portnumber our client should try to cennect to our winsockifyed MPD instance with
 * @param {String} [_host=document.URL] - hostname to try to connect to, defaults to the domain of the current page
 * @param {String} [_password] - password to connect with (if needed)
 */
function MPD(_port, _host, _password){

    /**
     * this will be the final output interface, but it is used to refer to the client as a 'this' like object
     * @lends MPD
     */
    var self = {};

    /********************\
    |* public interface *|
    \********************/

    /**
     * adds an event handler
     * @instance
     * @function
     * @throws {Error} an Error if you try to listen to an invalid event type
     * @param {String} event_name - what sort of event to listen for. must be one of the following:  'Error', 'Event', 'UnhandledEvent', 'AuthFailure', 'DatabaseChanging', 'DataLoaded', 'OutputChanged', 'StateChanged', 'QueueChanged', 'PlaylistsChanged', 'PlaylistChanged','Connect', 'Disconnect'
     * @param {errorEventHandler|disconnectEventHandler|connectEventHandler|playlistsChangedEventHandler|queueChangedEventHandler|outputChangedEventHandler|stateChangedEventHandler|dataLoadedEventHandler|databaseChangingEventHandler|unhandledEventHandler|eventHandler|errorEventHandler} handler - function called when the given event happens
     */
    self.on = on;

    /**
     * returns an object representation of the current state of MPD as the client understands it right now
     * this does NOT map to the client's functional API
     * @instance
     * @returns {state} object representing the current state of MPD
     */
    self.getState = function(){
        var ret = cloneObject(_private.state);
        //there are a few things we can't easily clone, but I made a clone method for those, so we can deal with this
        if(_private.state.current_queue !== null){
            ret.current_queue = _private.state.current_queue.clone();
        }

        return ret;
    };

    /**
     * call to turn off logging to the console
     * @instance
     */
    self.disableLogging = function(){
        _private.do_logging = false;
    };

    /**
     * call to turn logging to the console on (debugging)
     * @instance
     */
    self.enableLogging = function(){
        _private.do_logging = true;
    };

    /**
     * return the port number this client was instansiated with and thet it is (attempting to) connect with
     * @instance
     * @returns {Integer} the port number the MPD client is (trying to be) connected to
     */
    self.getPort = function(){
        return _port;
    };

    /**
     * return the host this client was instansiated with and thet it is (attempting to) connect with
     * @instance
     * @returns {String} the host name the MPD client is (trying to be) connected to
     */
    self.getHost = function(){
        return _host;
    };

    /**
     * gets the protocol versing reported on connection
     * @instance
     * @returns {String} string desxriping the protocol version i.e. "1.18.0"
     */
    self.getProtocolVersion = function(){
        return _private.state.version;
    };

    /**
     * retruns if we are connected or not
     * @instance
     * @returns {Boolean} true if we are connected, false if we are not
     */
    self.isConnected = function(){
        return _private.state.connected == true;
    };

    /**
     * Returns a string enum describing the playback state
     * @instance
     * @returns {String} - 'play', 'pause', 'stop'
     */
    self.getPlaystate = function(){
        return _private.state.playstate;
    };

    /**
     * returns the current volume
     * @instance
     * @returns {Float} between 0 and 1
     */
    self.getVolume = function(){
        return _private.state.volume;
    };

    /**
     * returns if we are in repeat mode or not
     * @instance
     * @returns {Boolean} true if we are in repeat mode, false otherwise
     */
    self.isRepeat = function(){
        return _private.state.repeat == true;
    };

    /**
     * returns if we are in single mode or not
     * @instance
     * @returns {Boolean} true if we are in single mode, false otherwise
     */
    self.isSingle = function(){
        return _private.state.single == true;
    };

    /**
     * returns if we are in consume mode or not
     * @instance
     * @returns {Boolean} true if we are in consume mode, false otherwise
     */
    self.isConsume = function(){
        return _private.state.consume == true;
    };

    /**
     * returns if we are in random playback mode or not
     * @instance
     * @returns {Boolean} true if we are in random mode, false otherwise
     */
    self.isRandom = function(){
        return _private.state.random == true;
    };

    /**
     * ammount of time (in seconds) the MPD server is set to crossfade songs. 0 means disabled
     * @instance
     * @returns {Number} true if we are in random mode, false otherwise
     */
    self.getCrossfadeTime = function(){
        return _private.state.crossfade;
    };

    /**
     * honestly don't know what this is, has something to do with some sort of fading mode I never use, but MPD reports it so I'm making an accessor for it in case someone else wants to use it
     * @instance
     * @returns {Float}
     */
    self.getMixRampThreashold = function(){
        return _private.state.mix_ramp_threshold;
    };


    /**
     * gets the currently playing song
     * @instance
     * @function
     * @returns {Song}
     */
    self.getCurrentSong = getCurrentSong;

    /**
     * gets the time of the current song. will calculate it based on the reported time, and how long it's been since that happened
     * @instance
     * @function
     * @returns {Float}
     */
    self.getCurrentSongTime = getCurrentSongTime;

    /**
     * get's the queue id of the currently playing song
     * @instance
     * @returns {Integer}
     */
    self.getCurrentSongID = function(){
        return _private.state.current_song.id;
    };

    /**
     *gets the position on the queue of the song currently playing
     * @instance
     * @returns {Integer}
     */
    self.getCurrentSongQueueIndex = function(){
        return _private.state.current_song.queue_idx;
    };


    /**
     * gets the song next to be played
     * @instance
     * @function
     * @returns {Song}
     */
    self.getNextSong =getNextSong;

    /**
     * gets the queue id of the next song to play
     * @instance
     * @returns {Integer}
     */
    self.getNextSongID = function(){
        return _private.state.next_song.id;
    };

    /**
     * returns the position on the queue of the next song on the queue to play
     * @instance
     * @returns {Integer}
     */
    self.getNextSongQueueIndex = function(){
        return _private.state.next_song.queue_idx;
    };


    /**
     * get the whole queue
     * @instance
     * @returns {Queue}
     */
    self.getQueue = function(){
        return _private.state.current_queue;
    };

    /**
     * returns the version of the queue, this number changes every time the queue does
     * @instance
     * @returns {Integer}
     */
    self.getQueueVersion = function(){
        return _private.state.queue_version;
    };


    /**
     * fetches a playlist from MPD identified by it's name
     * @instance
     * @param {String} playlist name - the name of the playlist you want
     * @param {playlistCallback} onDone - function to call with the playlist when we get it
     */
    self.getPlaylist = function(name, onDone){
        var ret = null;
        for(var i = 0; i<_private.state.playlists.length; i++){
            if(_private.state.playlists[i].playlist==name){
                issueCommands({
                    command:'listplaylistinfo "'+name+'"',
                    handler:getPlaylistHandler(onDone, i)
                });
                return;
            }
        };
        onDone(null);
    };


    /**
     * returns an array of strings that is the list of the names of all available saved playlists
     * @instance
     * @returns {String[]}
     */
    self.getPlaylists = function(){
        var playlists = [];
        _private.state.playlists.forEach(function(playlist){
            playlists.push(playlist.playlist);
        });
        return playlists;
    };


    /**
     * returns an array of Output objects
     * @instance
     * @returns {Output[]}
     */
    self.getOutputs = function(){
        return _private.outputs.map(function(source){
            return MPD.Output(self, source);
        });
    };


    /**
     * returns true if the output is enabled, false otherwise
     * @param {Integer} id -- the identifier of the output
     * @instance
     */
    self.outputIsEnabled = function(id){
        return _private.outputs[id].outputenabled == 1;
    };


    /**
     * turns on the output specified by the id
     * @param {Integer} id -- the identifier of the output to turn on
     * @instance
     */
    self.enableOutput = function(id){
        issueCommands('enableoutput '+id);
    };

    /**
     * turns off the output specified by the id
     * @param {Integer} id -- the identifier of the output to turn off
     * @instance
     */
    self.disableOutput = function(id){
        issueCommands('disableoutput '+id);
    };

    /**
     * turns on consume mode
     * @instance
     */
    self.enablePlayConsume = function(){
        issueCommands('consume 1');
    };

    /**
     * turns off consume mode
     * @instance
     */
    self.disablePlayConsume = function(){
        issueCommands('consume 0');
    };

    /**
     * turns on crossfade
     * @param {String} time -- time to crossfade in seconds, 0 to disable
     * @instance
     */
    self.setCrossfade = function(time) {
        issueCommands('crossfade '+time);
    };

    /**
     * turns on random play mode
     * @instance
     */
    self.enableRandomPlay = function(){
        issueCommands('random 1');
    };

    /**
     * turns off random play mode
     * @instance
     */
    self.disableRandomPlay = function(){
        issueCommands('random 0');
    };

    /**
     * turns on repeat play mode
     * @instance
     */
    self.enableRepeatPlay = function(){
        issueCommands('repeat 1');
    };

    /**
     * turns of repeat play mode
     * @instance
     */
    self.disableRepeatPlay = function(){
        issueCommands('repeat 0');
    };

    /**
     * turns on single play mode
     * @instance
     */
    self.enableSinglePlay = function(){
        issueCommands('single 1');
    };

    /**
     * turns of single play mode
     * @instance
     */
    self.disableSinglePlay = function(){
        issueCommands('single 0');
    };

    /**
     * Sets the threshold at which songs will be overlapped. Like crossfading but doesn't fade the track volume, just overlaps. The songs need to have MixRamp tags added by an external tool. 0dB is the normalized maximum volume so use negative values, I prefer -17dB. In the absence of mixramp tags crossfading will be used. See http:     // sourceforge.net/projects/mixramp
     * @instance
     * @param {Float} decibels
     */
    self.setMixRampDb = function(decibels){
        issueCommands('mixrampdb '+decibels);
    };

    /**
     * Additional time subtracted from the overlap calculated by mixrampdb. A value of "nan" disables MixRamp overlapping and falls back to crossfading.
     * @instance
     * @param {(float|string)} seconds - time in seconds or "nan" to disable
     */
    self.setMixRampDelay = function(seconds){
        issueCommands('mixrampdelay '+seconds);
    };

    /**
     * Sets volume, the range of volume is 0-1.
     * @instance
     * @param {Float} volume - 0-1
     */
    self.setVolume = function(volume){
        volume = Math.min(1,volume);
        volume = Math.max(0,volume);
        issueCommands('setvol '+Math.round(volume*100));
    };

    /**
     * Begins playing if not playing already. optional parameter starts playing a particular song
     * @instance
     * @param {Integer} [queue_position=<current song>] - the song to start playing
     */
    self.play = function(queue_position){
        if(typeof queue_position != 'undefined'){
            issueCommands('play '+queue_position);
        }
        else{
            issueCommands('play');
        }
    };

    /**
     * Begins playing the playlist at song identified by the passed song_id.
     * @instance
     * @param {Integer} song_id - the queue id of the song you want to start playing
     */
    self.playById = function(song_id){
        issueCommands('playid '+song_id);
    };

    /**
     * pauses/resumes playing
     * @instance
     * @param {Boolean} [do_pause=true] - true if you want to pause, false if you want to be unpaused
     */
    self.pause = function(do_pause){
        if(typeof do_pause == 'undefined' || do_pause){
            issueCommands('pause 1');
        }
        else{
            issueCommands('pause 0');
        }
    };

    /**
     * Plays next song in the queue.
     * @instance
     */
    self.next = function(){
        issueCommands('next');
    };

    /**
     * Plays previous song in the queue.
     * @instance
     */
    self.previous = function(){
        issueCommands('previous');
    };

    /**
     * Seeks to the position time (in seconds) within the current song. If prefixed by '+' or '-', then the time is relative to the current playing position.
     * @instance
     * @param {(float|string)} - what point in the current song to seek to or string with a signed float in it for relative seeking. i.e. "+0.1" to seek 0.1 seconds into the future, "-0.1" to seek 0.1 seconds into the past
     */
    self.seek = function(time){
        issueCommands('seekid '+_private.state.current_song.id+' '+time);
    };

    /**
     * Stops playing.
     * @instance
     */
    self.stop = function(){
        issueCommands('stop');
    };

    /**
     * Adds the file to the playlist (directories add recursively).
     * @instance
     * @param {String} pathname - of a single file or directory. relative to MPD's mussic root directory
     */
    self.addSongToQueueByFile = function(filename){
        issueCommands('add "'+filename+'"');
    };

    /**
     * Clears the current queue
     * @instance
     */
    self.clearQueue = function(){
        issueCommands('clear');
    };

    /**
     * Deletes a song from the queue
     * @instance
     * @param {Integer} position - index into the queue to the song you don't want to be on the queue any more
     */
    self.removeSongFromQueueByPosition = function(position){
        issueCommands('delete '+position);
    };

    /**
     * Deletes a range of songs from the playlist.
     * @instance
     * @param {Integer} start - the queue index of the first song on the playlist you want to remove
     * @param {Integer} end - the queue index of the last song on the playlist you want to remove
     */
    self.removeSongsFromQueueByRange = function(start, end){
        issueCommands('delete '+start+' '+end);
    };

    /**
     * Deletes the song identified with the passed queue id from the playlist
     * @instance
     * @param {Integer} id - the queue id of the song you want to remove from the queue
     */
    self.removeSongFromQueueById = function(id){
        issueCommands('deleteid '+id);
    };

    /**
     * a song from one position on the queue to a different position
     * @instance
     * @param {Integer} position - the position of the song to move
     * @param {Integer} to - where you want the sang to go
     */
    self.moveSongOnQueueByPosition = function(position, to){
        issueCommands('move '+position+' '+to);
    };

    /**
     * moves a range of songs on the queue
     * @instance
     * @param {Integer} start - the queue index of the first song on the queue you want to move
     * @param {Integer} end - the queue index of the last song on the queue you want to move
     * @param {Integer} to - the queue index were the first song should end up
     */
    self.moveSongsOnQueueByPosition = function(start, end, to){
        issueCommands('move '+start+':'+end+' '+to);
    };

    /**
     * moves the song identified with the passed queue id to the passed queue index
     * @instance
     * @param {Integer} id - queue id of the song you want to move
     * @param {Integer} to - the queue indes you want it to be
     */
    self.moveSongOnQueueById = function(id, to){
        issueCommands('moveid '+id+' '+to);
    };

    /**
     * Shuffles the current playlist.
     * @instance
     */
    self.shuffleQueue = function(){
        issueCommands('shuffle');
    };

    /**
     * Swaps the positions of two songs identified by their queue indexes
     * @instance
     * @param {Integer} pos1 - queue index of the first song
     * @param {Integer} pos2 - queue index of the second song
     */
    self.swapSongsOnQueueByPosition = function(pos1, pos2){
        issueCommands('swap '+pos1+' '+pos2);
    };

    /**
     * Swaps the positions of two songs identified by their queue ids
     * @instance
     * @param {Integer} id1 - queue id of the first song
     * @param {Integer} id2 - queue id of the second song
     */
    self.swapSongsOnQueueById = function(id1, id2){
        issueCommands('swapid '+id1+' '+id2);
    };

    /**
     * Loads the given playlist to the end of the current queue.
     * @instance
     * @param {String} playlist_name - the name of the playlist you want to append to the queue
     */
    self.appendPlaylistToQueue = function(playlist_name){
        issueCommands('load "'+playlist_name+'"');
    };

    /**
     * Loads the given playlist into the current queue replacing it.
     * @instance
     * @param {String} playlist_name - the name of the playlist you want to append to the queue
     */
    self.loadPlaylistIntoQueue = function(playlist_name){
        issueCommands([
            'clear',
            'load "'+playlist_name+'"'
        ]);
    };

    /**
     * Saves the current queue as a the given playlist, overwrites exsisting playlist of that name if it exsists, otherwise makes a new one
     * @instance
     * @param {String} playlist_name - the name of the playlist you want to use as your new queue
     */
    self.saveQueueToPlaylist = function(playlist_name){
        issueCommands('save "'+playlist_name+'"');
    };

    /**
     * adds the given song (filename) to the given playlist
     * @instance
     * @param {String} playlist_name - the playlist to add the song to
     * @param {String} filename - the filename of the song you want to add
     */
    self.addSongToPlaylistByFile = function(playlist_name, filename){
        issueCommands('playlistadd "'+playlist_name+'" "'+filename+'"');
    };

    /**
     * Clears the playlist leaving it still in exsistance, but empty
     * @instance
     * @param {String} playlist_name - the poor unfortunate playlist you want to hollow out
     */
    self.clearPlaylist = function(playlist_name){
        issueCommands('playlistclear "'+playlist_name+'"');
    };

    /**
     * Deletes the song at the given position from the given playlist
     * @instance
     * @param {String} playlist_name - the name of the playlist with a song on it that you think shouldn't be there anymore
     * @param {Integer} position - the position in the playlist of the song you want to remove
     */
    self.removeSongFromPlaylistByPosition = function(playlist_name, position){
        issueCommands('playlistdelete "'+playlist_name+'" '+position);
    };

    /**
     * moves the song from one position on the playlist to another
     * @instance
     * @param {String} playlist_name - the name of the playlist on which you want to move a song
     * @param {Integer} from - position on the playlist of the song you want to move
     * @param {Integer} to - the position to which you want to move the song
     */
    self.moveSongOnPlaylistByPosition = function(playlist_name, from, to){
        issueCommands('playlistmove "'+playlist_name+'" '+from+' '+to);
    };

    /**
     * Renames the playlist
     * @instance
     * @param {String} playlist_name - the name is it right now
     * @param {String} new_name - the name it should be
     */
    self.renamePlaylist = function(playlist_name, new_name){
        issueCommands('rename "'+playlist_name+'" "'+new_name+'"');
    };

    /**
     * this kills the playlist
     * @instance
     * @param {String} playlist_name - the name of the playlist you want to obliterate and never see any trace of again
     */
    self.deletePlaylist = function(playlist_name){
        issueCommands('rm "'+playlist_name+'"');
    };

    /**
     * Updates the music database: find new files, remove deleted files, update modified files.
     * @instance
     */
    self.updateDatabase = function(){
        issueCommands('update');
    };

    /**
     * @instance
     * @param {String} [path] - path to the directory you are interested in relative to MPD's music root directory (root is a blank string, never start with '/')
     * @param {directoryContentsCallback}
     */
    self.getDirectoryContents = function(path, onDone){
        issueCommands({
            command:'lsinfo "'+path+'"',
            handler:getDirectoryHandler(onDone)
        });
    };

    /**
     * return an array of strings which are all of the valid tags
     * note there might be more undocumented tags that you can use just fine not listed here (like musicbrainz)
     * @instance
     * @returns {String[]}
     */
    self.getTagTypes = function getTagTypes(){
        return cloneObject(_private.tag_types);
    };

    /**
     * params is a {tag<string> => value<string>} object, valid tags are enumerated in getTagTypes.
     * onDone is a function that should be called on complete, will be passed an array of strings that are the values of the tag identified by tag_type that are on songs that match the search critaria
     *
     * @example
     * client.tagSearch(
     *     'album',
     *     {artist:'bearsuit'},
     *     function(albums){
     *        //albums == ["Cat Spectacular", "Team Pingpong", "OH:IO", "The Phantom Forest"]
     *        //which are all of the albums of the band Bearsuit
     *     }
     * );
     * @instance
     * @param {Object[]} params - Array of objects that maps a tag to a value that you want to find matches on that tag for {tag<string> => value<string>}. For a list of acceptable tag/keys @see {@link getTagTypes}. For a list of acceptable values for a given tag @see {@link getTagOptions}.
     * @param {searchResultsCallback} onDone - function called when the search results have come back, is passed the results as it's only parameter
     */
    self.tagSearch = function doTagSearch(tag_type, params, onDone){
       var query = 'list '+tag_type;
       for(key in params){
           var value = params[key];
           query += ' '+key+' "'+value+'"';
       }
       issueCommands({
           command:query,
           handler:getTagSearchHandler(onDone, tag_type)
       });
   };

    /**
     * params is a {tag<string> => value<string>} object, valid tags are enumerated in getTagTypes, onDone is a function that should be called on complete, will be passed an array of song objects
     * @instance
     * @param {Object[]} params - Array of objects that maps a tag to a value that you want to find matches on that tag for {tag<string> => value<string>}. For a list of acceptable tag/keys @see {@link getTagTypes}. For a list of acceptable values for a given tag @see {@link getTagOptions}.
     * @param {searchResultsCallback} onDone - function called when the search results have come back, is passed the results as it's only parameter
     */
    self.search = function(params, onDone){
         var query = 'search';
         for(key in params){
             var value = params[key];
             query += ' '+key+' "'+value+'"';
         }
         issueCommands({
             command:query,
             handler:getSearchHandler(onDone)
         });
     };

    /**
     * like search except just for finding how many results you'll get (for faster live updates while criteria are edited)
     * params is a {tag<string> => value<string>} object, valid tags are enumerated in getTagTypes, onDone is a function that should be called on complete, will be passed the numver of results the search would produce
     * @instance
     * @param {Object[]} params - Array of objects that maps a tag to a value that you want to find matches on that tag for {tag<string> => value<string>} For a list of acceptable tag/keys @see {@link getTagTypes}. For a list of acceptable values for a given tag @see {@link getTagOptions}.
     * @param {searchCountCallback} onDone - function called when the search results have come back, is passed the results as it's only parameter
     */
    self.searchCount = function(params, onDone){
        var query = 'count';
        for(key in params){
            var value = params[key];
            query += ' '+key+' "'+value+'"';
        }
        issueCommands({
            command:query,
            handler:getSearchHandler(function(results){
                onDone(results[0]);
            })
        });
    };

    /**
     * set the password for this client
     * @instance
     * @param {String}
     */
    self.authorize = function(password){
        _password = password;
        if(_private.state.connected){
            //if we are not connected we will issue the password as part of our reconnection
            issueCommands('password '+_password);
        }
    }

   /****************\
   |* private data *|
   \****************/

   var _private = {
     /**
      * THE web socket that is connected to the MPD server
      * @private
      */
     socket:null,

     /**
      * running string of partial responces from MPD
      */
     raw_buffer:'',

     /**
      * running list of lines we have gotten from the server
      */
     raw_lines:[],

     /**
      * false if we are disconnected or have not completed out initial data load yet
      */
     inited: false,

     /**
      * events that have been held until we are consistent
      */
     queued_events:[],

     /**
      * object {string:[function]} -- listing of funcitons to call when certain events happen
      *
      * valid handlers:
      * Connect
      * Disconnect
      * Queue
      * State
      * SongChange
      * Mpdhost
      * Error
      * @private
      */
     handlers:{},

     /**
      * number -- int number of milisecond to wait until reconnecting after loosing connection
      * set to something falsyto disable automatic reconnection
      * @private
      */
     reconnect_time: 3000,

     /**
      * true if we want logging turned on
      * @private
      */
     do_logging: false,

     /**
      * Our understanding of what the server looks like
      * @typedef {Object} state
      * @property {String} version - server protocol version
      * @property {Boolean} connected - if we are currently connected to the server or not
      * @property {String} playstate - enum, PLAYING, STOPPED, PAUSED
      * actual MPD attribute: state (int 0,1,2)
      * @property {Integer} volume - 0 to 1 the current volume
      * @property {Boolean} repeat - true if the server is configured to repeat the current song
      * @property {Boolean} single - true if the server is configured to just play one song then quit
      * @property {Boolean} consume - true if the server is configured to not repeat songs in a playlist
      * @property {Boolean} random - true if the server is configured to play music in a random order
      * @property {Integer} crossfade - nonnegitive integer representing number of seconds to crossfade songs
      * @property {Float} mix_ramp_threshold - not sure what this is, but it's reported
      * actual MPD attribute: mixrampdb
      * @property {Object} current_song - info about the currently playing song
      * @property {Integer} current_song.queue_idx - which song in the current playlist is active
      * actual MPD attribute: song
      * @property {Float} current_song.elapsed_time - time into the currently playing song in seconds
      * actual MPD attribute: elapsed
      * @property {Integer} current_song.id - the id of the current song
      * actual MPD attribute: songid
      * @property {Object} next_song - info about the song next to play on the queue
      * @property {Integer} next_song.queue_idx - which song in the current playlist is active
      * actual attribute: song
      * @property {Integer} next_song.id - the id of the current song
      * actual attribute: songid
      * @property {Queue} current_queue - the songs that are currently in rotation for playing, in the order they are to play (unless random is set to true)
      * @property {Integer} queue_version - a number associated with the queue that changes every time the queue changes
      * @property {String[]} playlists - names of all of the saved playlists
      */
     state:{
         version: null,
         connected:false,
         playstate: null,
         volume: null,
         repeat: null,
         single: null,
         consume: null,
         random: null,
         crossfade: null,
         mix_ramp_threshold: null,
         current_song: {
             queue_idx: null,
             elapsed_time: null,
              id: null
         },

         next_song: {
             queue_idx: null,
              id: null
         },
         current_queue: null,
         queue_version: null,
         playlists:[]
     },

     /**
      * list of tags that are acceptable for this server
      */
     tag_types:[],

     /**
      * list of available outputs
      */
     outputs:[],

     /**
      * when was the status last updated
      * @private
      */
     last_status_update_time: new Date(),

     /**
      *method called when we get a responce from MPD
      */
     responceProcessor:null,

     /**
      * sequence of handlers for the sequence of commands that have been issued
      * @private
      */
     commandHandlers:[],

     /**
      * commands that are yet to be processed
      */
     command_queue:[],

     /**
      *last error we had
      */
     last_error: null
   };


    /*******************\
    |* private methods *|
    \*******************/

    /****************************\
    |* UTF-8 compatability code *|
    \****************************/

    /* because websockify apparently doesn't do this :\ */

    /**
     * convert a string to a UTF-8 byte sequence
     * @private
     */
    function encodeString(str){
      var bytes = [];
      for(var i = 0; i < str.length; i++){
        var char = str.codePointAt(i);
        if(char > 65535){
          bytes.push(240 | (char >> 18) & 7);   // 11110xxx
          bytes.push(128 | (char >> 12) & 63);  // 10xxxxxx
          bytes.push(128 | (char >>  6) & 63);  // 10xxxxxx
          bytes.push(128 | (char & 63));        // 10xxxxxx
        }
        if(char > 2047){
          bytes.push(224 | (char >> 12) & 15);  // 1110xxxx
          bytes.push(128 | (char >>  6) & 63);  // 10xxxxxx
          bytes.push(128 | (char & 63));        // 10xxxxxx
        }
        if(char > 127){
          bytes.push(192 | (char >> 6) & 31);   // 110xxxxx
          bytes.push(128 | (char & 63));        // 10xxxxxx
        }
        else{
          bytes.push(char & 127);               // 0xxxxxxx
        }
      }
      return bytes;
    }


    /**
     * convert the byte sequence to a UTF-8 string
     * @private
     */
    function decodeString(bytes){
        //build a character code array
        var chars = [];
        for(var i = 0; i<bytes.length; i++){
          var char = bytes[i];
          if(char > 127){
            if((char & 224) == 192){
              //char 0b11100000 = 0b11000000 first 3 bits are 110
              //first byte of a 2 byte sequence
              char =
                ((char & 31) << 6) | // 110xxxxx & 00011111
                (bytes[i+1] & 63);  // 10xxxxxx & 00111111
              i+=1;
            }
            else if((char & 240) == 224){
              //char 0b11110000 = 0b11100000 first 4 bits are 1110
              //first byte of a 3 byte sequence
              char =
                ((char & 15) << 12) |       // 1110xxxx & 00001111
                ((bytes[i+1] & 63) << 6) | // 10xxxxxx & 00111111
                (bytes[i+2] & 63);         // 10xxxxxx
              i += 2
            }
            else if((char & 248) == 240){
              //char 0b11111000 = 0b11110000 first 5 bits are 11110
              //first byte of a 4 byte sequence
              char =
                ((char & 7) << 18) |          // 11110xxx & 00000111
                ((bytes[i+1] & 63) << 12) |  // 10xxxxxx & 00111111
                ((bytes[i+2] & 63) << 6) |   // 10xxxxxx & 00111111
                (bytes[i+3] & 63);           // 10xxxxxx & 00111111
              i += 3;
            }
            else{
              throw new Error("#"+char+" invalid character encoding");
            }
          }
          else{
            char = char & 127;
            //shouldn't actually make a difference
          }
          chars.push(char);
        }
        return String.fromCodePoint.apply(null,chars);
    }

    /*************************\
    |* connection management *|
    \*************************/

    /**
     * wrapper for sending a message to the server, allows logging
     * @private
     */
    function sendString(str){
        log('sending: "'+str+'"');
        _private.socket.send(encodeString(str));
    }


    /**
     * initalization funciton
     * called near the end of this file and when we need to (try to) (re)connect
     * @private
     */
    function init(){
      var websocket_url = getAppropriateWsUrl();
      var websocket = new Websock();
      websocket.open(websocket_url);

      //these can throw
      websocket.on('open',onConnect);

      websocket.on('message', function(){
          _private.responceProcessor.apply(this,arguments);
      });

      websocket.on('close',onDisconnect);

      _private.socket = websocket;
    }


    /**
     * function called when the websocke connects
     * @private
     */
    function onConnect(){
        log("connected");
        _private.state.connected = true;
        _private.raw_buffer = '';
        _private.raw_lines = [];
        _private.responceProcessor = handleConnectionMessage;
        callHandler('Connect', arguments);
    }


    /**
     * called when we disconnected (unexpectedly)
     * @private
     */
    function onDisconnect(){
        log("disconnected");

        callHandler('Disconnect', arguments);

        _private.state.connected = false;
        _private.socket = null;
        _private.state.version = null;
        _private.commandHandlers = [];
        setInited(false);

        _private.responceProcessor = null; //will throw an error if we get any responces before we reconnect

        if(_private.reconnect_time){
            setTimeout(init, _private.reconnect_time);
        }
    }


    /**
     * change the state and deal with what happens when that state changes
     */
    function setInited(inited){
        _private.inited = inited;
        if(inited){
            var events = _private.queued_events;
            _private.queued_events = [];
            events.forEach(function(event){
                for(var key in event){
                    callHandler(key, event[key]);
                }
            });
        }
    }


    /************\
    |* commands *|
    \************/


    /**
     * issue one or more commands to the server
     * pass one command or an array of commands
     * a command can be in the form of a string, or a object
     * if a string is used as a command it will be assumed to have a 'do nothing' responce handler
     * if an object is passed it must be in the form of {command:<String>, handler:function(String[]), error:function(Error)}
     * this assumes we are starting in and wish to return to an idle state
     * @private
     */
    function issueCommands(commands, is_idling){
        if( Object.prototype.toString.call( commands ) !== '[object Array]' ) {
            //some joker didn't give us a set of commands... wrap it up
            commands = [commands];
        }

        if(_private.command_queue.length === 0){
            _private.command_queue = commands;
            //done in a timeout so we can combine commands effecently
            setTimeout(function(){
                processComandQueue(is_idling === false);
            }, 50);
        }
        else{
            //append additional commands, they'll get processed when the above command is done
            _private.command_queue.push.apply(_private.command_queue, commands);
        }
    }


    /**
     * get the next command off the queue and process it
     */
    function processComandQueue(is_not_idling){
        var command_string = '';

        if(_private.commandHandlers.length > 0 && _private.commandHandlers[0].command !== 'idle'){
            //there are outstatnding commands being processed still, wait until the last batch finishes
            //we don't have to timeout call ourself because we will be called when the outstanding commands are done
            //if we are waiting on the idle handler then this doesn't count
            return;
        }

        _private.command_queue.forEach(function(command){
            if(command instanceof Function){
                //case when we are given function, an 'on complete command'
                //if we are given a function, it will be called when all previous commands are complete
                _private.commandHandlers.push(command);
            }
            else{
                //normal case

                //if it's a string make it be an object
                if(typeof command === 'string'){
                    command = {command:command}; //malkovich
                }

                //if it doesn't have a handler give it a 'do nothing' handler
                if(typeof command.handler === 'undefined'){
                    command.handler = function(){};
                }

                //if it doesn't have a error handler give it the default error handler
                if(typeof command.error === 'undefined'){
                    command.error = defaultErrorHandler;
                }

                //now everything is normalized

                //append the command
                command_string += command.command+'\n';

                //set the handler
                _private.commandHandlers.push(command);
            }
        });
        _private.command_queue = [];

        //issue the command
        if('' === command_string){
            //if we were given nothing but post comand functions don't issue a null command
            //but do call all of those post comand functions
            _private.commandHandlers.forEach(function(func){
                //this whole branch is weird, so lets just check to make sure these are all post comand functions
                if(!func instanceof Function){
                    throw new Error('non-"post comand" function in commandHandlers when there was no command!');
                }
                func();
            });
        }
        else{
            var idle_command = {
                command:'idle',
                handler:idleHandler,
                error:defaultErrorHandler
            };
            _private.commandHandlers.push(idle_command);

            command_string = 'command_list_ok_begin\n'+command_string+'idle\ncommand_list_end\n';
            if(!is_not_idling){
                command_string = 'noidle\n'+command_string;
            }

            sendString(command_string);
        }
    }

    /**
     * what to do by default if a command fails
     */
    function defaultErrorHandler(error){
        var error_codes = MPD.getErrorCodes();
        //if it's an error we know something about, maybe we can deal with it, otherwise just call registered handlers
        switch(error.code){
            case error_codes.ACK_ERROR_PASSWORD:
            case error_codes.ACK_ERROR_PERMISSION:
                // we\the user tried to do something they are not allowed to do
                callHandler('AuthFailure', error, true);
            break;
            default:
                debugger;
                alert('***ERROR*** '+error.message);
                callHandler('Error', error, true);
            break;
        }
    }


    /*************************************\
    |* process responces from the server *|
    \*************************************/


    /**
     * return all of the lines upto one that matches the passed line
     * MUTATES lines
     * @private
     */
    function getLines(lines, last_line){
        var end_line = -1;
        for(var i = 0; i<lines.length; i++){
            var line = lines[i];
            if(line.match(last_line)){
                end_line = i;
                break;
            }
            if(line.indexOf('ACK') === 0){
                throw new Error('unexpected error');
            }
        }

        if(end_line === -1){
            return null;
        }
        return lines.splice(0, end_line+1);
    }


    /**
     * return error object if there is one, null otherwise
     * MUTATES lines
     * @private
     */
    function getError(lines){
        var line = lines[0];
        var error = null;
        if(line.indexOf('ACK') === 0){
            log('***ERROR*** '+line);
            //parse the error into an object
            error = line.match(/ACK \[(\d+)@(\d+)\] \{([^}]+)} (.*)/);
            error = {
                code: parseInt(error[1], 10),
                line: parseInt(error[2], 10),
                command: error[3],
                message: error[4]
            };
            lines.splice(0,1);
        }
        return error;
    }


    /**
     * generic responce handler
     * deals with a responce that is a list of some sort of datastructure repeated over and over
     * @private
     */
    function processListResponce(lines, new_file_marker){
        var output = [];
        var current_thing = null;
        var file_marker = null
        //so, we get an undiferentiated stream of key/value pairs
        lines.forEach(function(line){
            if(!current_thing){
                current_thing = {};
            }
            var key = line.replace(/([^:]+): (.*)/,'$1');
            var value = line.replace(/([^:]+): (.*)/,'$2');
            var date = null;
            if(value.length>0){
                if(value.match(/^\d*(\.\d*)?$/)){
                    value = parseFloat(value);
                }
                else if(date = parseDate(value)){
                    value = date;
                }
            }
            key = key.toLowerCase();
            key = key.replace(/[^\w\d]+/g, '_');

            //we are starting a new object
            if(file_marker && key.match(file_marker)){
                output.push(current_thing);
                current_thing = {};
            }
            current_thing[key] = value;

            //we want to skip the first, starting key so this is down here
            if(file_marker === null){
                if(new_file_marker){
                    file_marker = new_file_marker;
                }
                else{
                    file_marker = new RegExp('^'+key+'$');
                }
            }

        });

        //get the last one
        if(current_thing){
            output.push(current_thing);
        }

        return output;
    }


    /**
     *fetch outstanding lines from MPD
     */
    function getRawLines(){

        _private.raw_buffer += decodeString(_private.socket.rQshiftBytes());//get the raw string

        var lines = _private.raw_buffer.split('\n');//split that into lines

        _private.raw_buffer = lines.pop(); //last line is incomplete

        _private.raw_lines.push.apply(_private.raw_lines,lines); //append these new lines to the running collection we have

        if(_private.do_logging){
            lines.forEach(function(str){log('recived: "'+str+'"');}); //log what we got
        }

        return _private.raw_lines;
    }


    /**
     * called when we have some data,
     * might be a message,
     * might be a fragment of a message,
     * might be multiple messages
     * @private
     */
    function onRawData(){
        var lines = getRawLines();
        //keep processing untill we can't process any more
        var command_processor = null;
        var old_lines;//this is infinite loop prevention, should never actually happen
        while(lines.length > 0 && old_lines != lines.length){
            old_lines = lines.length;

            var error = getError(lines);
            if(error){
                //this command hit an error
                command_processor = _private.commandHandlers.shift(); //get the next outstanding command processor
                command_processor.error(error);
            }
            else{
                var command_lines = getLines(lines, /^OK$|^list_OK$/);//get everything until the 'OK' line
                if(command_lines === null){
                    //we have hit the end of the useable lines
                    break;
                }
                command_lines.pop(); //get rid of the 'OK'

                command_processor = _private.commandHandlers.shift(); //get the next outstanding command processor

                command_processor.handler(command_lines); //execure the processor on the results of the command
            }

            //call everything we are supposed to just call
            while(_private.commandHandlers.length > 0 && _private.commandHandlers[0] instanceof Function){
                _private.commandHandlers.shift()();
            }
        }

        //if there are no commandHandlers left, we have definitely exauhsted our outstanding commands
        //if there is something in the command_queue, we have another batch of commands to issue
        //so process them
        if(_private.commandHandlers.length === 0 && _private.command_queue > 0){
            processComandQueue();
        }
    }


    /**
     * we are expecting a connection responce
     * this handles raw data because when we first connect the protocol is comepletely different than at any other point
     * @private
     */
    function handleConnectionMessage(){
        var lines = getRawLines();

        if(lines.length < 1){
            return;
        }

        var line = lines.shift(1);

        _private.state.version = line.replace(/^OK MPD /, '');

        _private.responceProcessor = onRawData;

        if(typeof _password !== 'undefined'){
            issueCommands({
                command:'password '+_password,
                error:cancelLoad
            });
        }

        //issue the commands that will (re)init this object
        loadEverything();
    }

    /********************\
    |* command handlers *|
    \********************/

    /**
     * handles the 'tagtypes' command
     */
    function tagHandler(lines){
        var tag_types = processListResponce(lines);
        _private.tag_types = ['any'].concat(
            tag_types.map(function(tagtype){
                return tagtype.tagtype.toLowerCase();
            })
        );
    }

    /**
     * deal with the result of the 'outputs' command
     */
    function outputHandler(lines){
        _private.outputs = processListResponce(lines);

        callHandler('OutputChanged',self.getOutputs());
    }

    /**
     * handle the responce from the 'status' command
     * @private
     */
    function stateHandler(lines){

        //update this so playtime is calculated accurately
        _private.last_status_update_time = new Date();

        log('state');

        //convert the lines into an object
        var state = {};
        lines.forEach(function(line){
            var key = line.replace(/([^:]+): (.*)/,'$1');
            var value = line.replace(/([^:]+): (.*)/,'$2');
            if(value.match(/^\d*(\.\d*)?$/)){
                value = parseFloat(value);
            }
            state[key] = value;
        });

        //normalize some of the state properties because I don't like them the way they are
        //because of course I know better than the MPD maintainers what things should be called and the ranges things should be in
        state.current_song = {
            queue_idx: state.song,
            elapsed_time: state.elapsed,
            id: state.songid
        };
        delete state.song;
        delete state.elapsed;
        delete state.songid;

        state.mix_ramp_threshold = state.mixrampdb;
        state.playstate = state.state;
        state.queue_version = state.playlist;
        state.crossfade = (typeof state.xfade === 'undefined')?0:state.xfade;
        delete state.mixrampdb;
        delete state.state;
        delete state.playlist;
        delete state.xfade;

        state.next_song = {
            queue_idx: state.nextsong,
            id: state.nextsongid
        };
        delete state.nextsong;
        delete state.nextsongid;

        state.volume /= 100;

        for(property in state){
            _private.state[property] = state[property];
        }

        callHandler('StateChanged',self.getState());
    }


    /**
     * handler for the current queue
     * @private
     */
    function queueHandler(lines){
        var queue_songs = processListResponce(lines);

        var source = { songs: queue_songs.map(
            function(song){
                return MPD.QueueSong(self,song);
            }
        )};

        _private.state.current_queue = MPD.Queue(self, source);

        callHandler('QueueChanged',self.getQueue());
    }


    /**
     * handler for the list of playlists
     * @private
     */
    function playlistsHandler(lines){
        _private.state.playlists = processListResponce(lines);

        callHandler('PlaylistsChanged',self.getPlaylists());
    }

    /*\
    | meta-handlers
    \*/

    /**
     * get a handler wrapper for the results of a search
     * @private
     */
    function getSearchHandler(onDone){
        return function(lines){
            var results = processListResponce(lines);
            onDone(results.map(function(song){
                return MPD.SearchSong(self,song);
            }));
        };
    }


    /**
     * get a handler wrapper for the results of a tag search
     * @private
     */
    function getTagSearchHandler(onDone, tag){
        return function(lines){
            var results = processListResponce(lines);
            onDone(results.map(function(result){
                return result[tag];
            }));
        };
    }


    /**
     * handler for the list of directories
     * @private
     */
    function getDirectoryHandler(onDone){
        return function(lines){
            var results = processListResponce(lines, /^file$|^directory$/);
            onDone(results.map(function(file){
                if(typeof file.file !== 'undefined'){
                    return MPD.FileSong(self,file);
                }
                else{
                    return MPD.Directory(self,file);
                }
            }));
        };
    }


    /**
     * handler for loading a single playlist
     * @private
     */
    function getPlaylistHandler(onDone, idx){
        return function(lines){
            var results = processListResponce(lines);

            var source = cloneObject(_private.state.playlists[idx]);
            source.songs = results.map(function(song, pos){
                song.position = pos;
                return MPD.PlaylistSong(self,song);
            });
            onDone(MPD.Playlist(self,source));
        };
    }


    /**
     * given a change key, return the command that will result in getting the changed data
     * @private
     */
    function figureOutWhatToReload(change){
        switch(change){
            case 'database': //the song database has been modified after update.
                //reload
                //everything
                return ['everything'];
            break;

            case 'stored_playlist': //a stored playlist has been modified, renamed, created or deleted, no idea which one
                return ['playlist'];
            break;

            case 'playlist': //the current playlist has been modified
                return ['queue'];
            break;

            /*these are all status changed*/
            case 'player': //the player has been started, stopped or seeked
            case 'options': //options like repeat, random, crossfade, replay gain
                return ['status'];
            break;

            case 'output': //an audio output has been enabled or disabled
                return ['outputs'];
            break;

            case 'mixer': //the volume has been changed
                return ['status','outputs'];
            break;

            /*these are things I'm not interested in (yet)*/
            case 'update': //a database update has started or finished. If the database was modified during the update, the database event is also emitted.
                //we don't want to do anything, but the front end might be interested in knowing about it
                callHandler('DatabaseChanging');
            case 'sticker': //the sticker database has been modified.
            case 'subscription': //a client has subscribed or unsubscribed to a channel
            case 'message': //a message was received on a channel this client is subscribed to; this event is only emitted when the queue is empty
            default:
                //default do nothing
                return [];
        }
    }


    /**
     * wait for something to change
     * this is the state we spend most of out time in
     * @private
     */
    function idleHandler(lines){
        if(lines.length > 0){
            var actions = {};
            lines.forEach(function(line){
                var change = line.replace(/([^:]+): (.*)/,'$2');
                var changes = figureOutWhatToReload(change);
                for(var i = 0; i<changes.length; i++){
                    actions[changes[i]] = true;
                }
            });

            if(actions.everything){
                //don't even bother doing anything fancy
                loadEverything(true);
            }
            else{
                //now we have to reload all the stuff we need
                //in the right order

                var commands = [];

                if(actions.queue){
                    commands.push({
                        command:'playlistinfo',
                        handler:queueHandler
                    });
                }
                if(actions.status){
                    commands.push({
                        command:'status',
                        handler:stateHandler
                    });
                }
                if(actions.outputs){
                    commands.push({
                        command:'outputs',
                        handler:outputHandler
                    });
                    //TODO remove this hack when this bug is fixed in MPD
                    setTimeout(function(){
                        issueCommands({
                            command:'status',
                            handler:stateHandler
                        });
                    },500);
                }
                if(actions.playlist){
                    commands.push({
                        command:'listplaylists',
                        handler:playlistsHandler
                    });
                }

                if(commands.length > 0){
                    issueCommands(commands,false);
                }
            }
        }
    }


    /**
     * method name says it all
     * @private
     */
    function loadEverything(reload){
        setInited(false);

        //this loads all of the data from the MPD server we need
        //it gets the queue first, then the state (because the state references the queue),
        //then all of the other data that shouldn't change without MPD going down in no particular order
        issueCommands(
            [
                {
                    command:'playlistinfo',
                    handler:queueHandler,
                    error:cancelLoad
                },
                {
                    command:'status',
                    handler:stateHandler,
                    error:cancelLoad
                },
                {
                    command:'tagtypes',
                    handler:tagHandler,
                    error:cancelLoad
                },
                {
                    command:'outputs',
                    handler:outputHandler,
                    error:cancelLoad
                },
                {
                    command:'listplaylists',
                    handler:playlistsHandler,
                    error:cancelLoad
                },
                function(){
                    setInited(true);
                    callHandler('DataLoaded',_private.state);
                }
            ],
            reload === true
        );
    }

    /**
     * deal with getting an error during initial data load
     */
    function cancelLoad(error){
        _private.socket.close();
        _private.commandHandlers = [];
        _private.command_queue = [];
        _private.state.connected = false;
        defaultErrorHandler(error);
    }


    /**********\
    |* events *|
    \**********/


    /**
     * call all event handlers for the specified event
     * @private
     */
    function callHandler(event_name, args, uncached){
        if(!_private.inited && !uncached){
            var event_obj = {};
            event_obj[event_name] = args;
            _private.queued_events.push(event_obj);
            return;
        }

        var handler_name = 'on'+event_name;

        if(!_private.handlers[handler_name]){
            handler_name = 'onUnhandledEvent';
        }

        if(_private.handlers[handler_name]){
            _private.handlers[handler_name].forEach(function(func){
                try{
                    func(args, self);
                }
                catch(err){
                    callHandler('Error', err, true);
                }
            });
        }

        if(event_name !== 'Event'){
            callHandler('Event', {type:event_name, data:args}, uncached);
        }
    }


    /**
     * add an event handler
     * @private
     */
    function on(event_name, handler){

        var acceptable_handlers = ['Error', 'Event', 'UnhandledEvent', 'DatabaseChanging', 'AuthFailure', 'DataLoaded', 'StateChanged', 'OutputChanged', 'QueueChanged', 'PlaylistsChanged', 'PlaylistChanged','Connect', 'Disconnect'];

        if(acceptable_handlers.indexOf(event_name) === -1){
            throw new Error("'"+event_name+"' is not a supported event");
        }


        //bind the passed method to the client interface
        handler = handler.bind(self);

        var handler_name = 'on'+event_name;
        if(_private.handlers[handler_name]){
            _private.handlers[handler_name].push(handler);
        }
        else{
            _private.handlers[handler_name] = [handler];
        }
    }

    /*******************\
    |* utility methods *|
    \*******************/

    /**
     * logging function
     * @private
     */
    function log(message){
      if(_private.do_logging){
        console.log("MPD Client: "+message);
      }
    }

    /**
     * private method that gets the right websocket URL
     * @private
     */
    function getAppropriateWsUrl()
    {
      var protocol = '';
      var url = _host;
      if(typeof url === 'undefined'){
          //change the url so it points to the root
          _host = url = document.URL.replace(/((?:https?:\/\/)?[^\/]+).*/, '$1');
      }

      /*
       * We open the websocket encrypted if this page came on an
       * https:// url itself, otherwise unencrypted
       */

      //figure out protocol to use
      if(url.substring(0, 5) == "https"){
          protocol = "wss://";
          url = url.substr(8);
      }
      if(url.substring(0, 3) == "wss"){
          protocol = "wss://";
          url = url.substr(6);
      }
      else{
          protocol = "ws://";
          url = url.replace(/^\w+:\/\//, '');
      }

      url = protocol+url;

      if(_port){
        //use the port this client was initialized with
        url = url.replace(/:\d*$/,'')+':'+_port;
      }

      return url;
    }


    /**
     * converts an string to a Date
     * @private
     */
    function parseDate(source){
        var value = null;
        var matches = null;
        if(matches = source.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z/)){
            value = new Date();
            value.setFullYear(parseInt(matches[1],10));
            value.setMonth(parseInt(matches[2],10)-1);
            value.setDate(parseInt(matches[3],10));
            value.setHours(parseInt(matches[4],10));
            value.setMinutes(parseInt(matches[5],10));
            value.setSeconds(parseInt(matches[6],10));
        }
        return value;
    }

    /******************\
    |* public methods *|
    \******************/


    /**
     * get the current play time
     * @private
     */
    function getCurrentSongTime(){
        var current_song = getCurrentSong();
        if(!current_song){
            return 0;
        }

        var offset = 0;
        if(_private.state.playstate === 'play'){
            var now = new Date();

            offset = (now.getTime() - _private.last_status_update_time.getTime())/1000;
        }

        var last_time = _private.state.current_song.elapsed_time;
        last_time = last_time?last_time:0;

        return Math.min(last_time + offset, current_song.getDuration());
    }


    /**
     * get the song identified by it's position on the current queue, or null
     * @private
     */
    function getSongOnQueue(idx){
        var song = null;
        if(idx !== null && _private.state.current_queue.getSongs()[idx]){
            song = _private.state.current_queue.getSongs()[idx];
        }
        return song;
    }


    /**
     * get the current song, or null
     * @private
     */
    function getCurrentSong(){
        return getSongOnQueue(_private.state.current_song.queue_idx);
    }


    /**
     * get the song next on the queue, or null
     * @private
     */
    function getNextSong(){
        return getSongOnQueue(_private.state.next_song.queue_idx);
    }

    /**
     * make a deep copy of the passed object/array/primitive
     * @private
     */
    function cloneObject(obj){
        return JSON.parse(JSON.stringify(obj));
    }


    /********\
    |* INIT *|
    \********/
    init();
    //see I told you it was called down here

    return self;

};

/******************\
|* static methods *|
\******************/

/**
 * return an enum that maps error numbers to something that is almost readable
 * @instance
 * @returns {Object}
 */
MPD.getErrorCodes = function(){
    return {
        ACK_ERROR_NOT_LIST: 1,
        ACK_ERROR_ARG: 2,
        ACK_ERROR_PASSWORD: 3,
        ACK_ERROR_PERMISSION: 4,
        ACK_ERROR_UNKNOWN: 5,
        ACK_ERROR_NO_EXIST: 50,
        ACK_ERROR_PLAYLIST_MAX: 51,
        ACK_ERROR_SYSTEM: 52,
        ACK_ERROR_PLAYLIST_LOAD: 53,
        ACK_ERROR_UPDATE_ALREADY: 54,
        ACK_ERROR_PLAYER_SYNC: 55,
        ACK_ERROR_EXIST: 56
    };
};

/******************\
|* nested classes *|
\******************/

/**
 * A song that exsists in the MPD database
 * @class Song
 * @param {MPD} client - the MPD client object that owns this
 * @param {song_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
 */
MPD.Song = function(client, source){
     /**
      * @lends Song
      */
     var me = {};

     /**
      * get the MPD reported metadata, raw
      * @instance
      * @returns {song_metadata} gets the all of the raw metadata MPD provided
      */
     me.getMetadata = function(){
         return JSON.parse(JSON.stringify(source));
     };

     /**
      * get the best looking name for this song, prefer Title, fallback to something derived from filename
      * @instance
      * @returns {String} a good looking display name for this sing, suitable for presenting to the user
      */
     me.getDisplayName = function(){
         if(typeof source.title === 'undefined'){
            return source.file.replace(/^([^\/]*\/)+|\.\w+/g, '');
         }
         return source.title;
     };

     /**
      * get the filename
      * @instance
      * @returns {String} the full path to the music file in MPD's music directory. relative path.
      */
     me.getPath = function(){
         return source.file;
     };

     /**
      * when was the song file last altered
      * @instance
      * @returns {Date} when the song file last altered
      */
     me.getLastModified = function(){
         return source.last_modified;
     };

     /**
      * get the song's duration
      * @instance
      * @returns {Number} song duration in number of seconds
      */
     me.getDuration = function(){
         return source.time;
     };

     /**
      * get the song's artist
      * @instance
      * @returns {String} from the song metadata
      */
     me.getArtist = function(){
         return source.artist;
     };

     /**
      * get the song's title
      * @instance
      * @returns {String} from the song metadata
      */
     me.getTitle = function(){
         return source.title;
     };

     /**
      * get the song's album
      * @instance
      * @returns {String} from the song metadata
      */
     me.getAlbum = function(){
         return source.album;
     };

     /**
      * get the song's track
      * @instance
      * @returns {String} from the song metadata
      */
     me.getTrack = function(){
         return source.track;
     };

     /**
      * get the song's genre
      * @instance
      * @returns {String} from the song metadata
      */
     me.getGenre = function(){
         return source.genre;
     };

     /**
      * get the reported disk number from of the song, note this need not be a number or numeric, also need not exsist
      * @instance
      * @returns {String} reported disk
      */
     me.getDisk = function(){
         return source.disk;
     };

     /**
      * if this song is on the Queue, get the QueueSong
      * @instance
      * @returns {QueueSong}
      */
     me.getQueueSong = function(){
        var queue = client.getQueue().getSongs();
        for(var i = 0; i<queue.length; i++){
            if(queue[i].getPath() === me.getPath()){
                return queue[i];
            }
        }
        return null;
     };

     /**
      * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
      * @instance
      * @returns {Song}
      */
     me.clone = function(){
         return MPD.Song(client, source);
     };

     return me;
     /**
      * Object representation of a song. This is a direct translation of the data that MPD returns, if MPD does not think a particular
      * song should have a property it won't return one. What is documented here are the properties I have seen MPD return, not all of
      * these will be returned all of the time. The properties file, date, and time appear to be consistently returned, but MPD makes
      * no promises. All other properties I frequently find missing, you will need to check to make sure they are present before using.
      * @typedef {Object} song_metadata
      * @property {String} file - the full path to the music file in MPD's music directory. relative path.
      * @property {Date} last_modified - last time the file was altered
      * @property {Integer} time - duration of song in seconds
      * @property {String=} artist - optional metadata
      * @property {String=} title - optional metadata
      * @property {String=} album - optional metadata
      * @property {String=} track - optional metadata
      * @property {String=} genre - optional metadata
      * @property {String=} disk - optional metadata
      * @property {Integer} id - (*** queue songs only @see {@link QueueSong} ***) a persistent identifer for this song on the queue, is only relevent to the queue, is not associated with the song it's self
      * @property {Integer} pos - (*** queue songs only @see {@link QueueSong} ***) the position of the song on the queue. the queue index.
      */
 }

 /**
  * A song that is on the queue
  * @class QueueSong
  * @augments Song
  * @param {MPD} client - the MPD client object that owns this
  * @param {song_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
  */
MPD.QueueSong = function(client, source){
    /**
     * @lends QueueSong
     */
    var me = MPD.Song(client, source);

    /**
     * get the queue song id for this song
     * @instance
     * @returns {Integer} a persistent identifer for this song on the queue, is only relevent to the queue, is not associated with the song it's self
     */
    me.getId = function(){
        return source.id;
    };

    /**
     * get the song's position on the queue
     * @instance
     * @returns {Integer} the position of the song on the queue. the queue index.
     */
    me.getQueuePosition = function(){
        return source.pos;
    };

    /**
     * play this song
     * @instance
     */
    me.play = function(){
        return client.playById(me.getId());
    };

    /**
     * overrideing this becaue we already are a QueueSong
     * @instance
     * @override
     * @returns {QueueSong}
     */
    me.getQueueSong = function(){
       return me;
    };

    /**
     * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
     * @instance
     * @override
     * @returns {QueueSong}
     */
    me.clone = function(){
        return MPD.QueueSong(client, source);
    };

    return me;
}

/**
 * A song that is on a playlist
 * exactly like a normal song, but is here to let people override
 * @class PlaylistSong
 * @augments Song
 * @param {MPD} client - the MPD client object that owns this
 * @param {song_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
 */
MPD.PlaylistSong = function(client, source){
    var me = MPD.Song(client, source);

    /**
     * get the position of this song on the playlist
     * @instance
     * @returns {Integer}
     */
    me.getPlaylistPosition = function(){
        return source.position;
    }

    return me;
}

/**
 * A song that is from search results
 * exactly like a normal song, but is here to let people override
 * @class SearchSong
 * @augments Song
 * @param {MPD} client - the MPD client object that owns this
 * @param {song_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
 */
MPD.SearchSong = function(client, source){
    return MPD.Song(client, source);
}

/**
 * A song that is from manually exploring the library
 * exactly like a normal song, but is here to let people override
 * @class FileSong
 * @augments Song
 * @param {MPD} client - the MPD client object that owns this
 * @param {song_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
 */
MPD.FileSong = function(client, source){
    return MPD.Song(client, source);
}

/**
 * Object representation of a directory. Directories are representations of folders that contain other folders and songs, they
 * map to directories on the MPD server's machine. This appears to be a fairly stable structure returned by MPD.
 * I could see an argument in favor of a common ancesstor with Song, because everything in this class has a direct analog in Song.
 * @class Directory
 * @param {MPD} client - the MPD client object that owns this
 * @param {directory_metadata} source - raw metadata javascript object that contains the MPD reported data for this song
 */
MPD.Directory = function(client, source){
     /**
      * @lends Songlist
      */
    var me = {};

    /**
     * get the MPD reported metadata, raw
     * @instance
     * @returns {directory_metadata} gets the all of the raw metadata MPD provided
     */
    me.getMetadata = function(){
        return JSON.parse(JSON.stringify(source));
    };

    /**
     * get the path to (including) this directory. relative to the MPD server's media root
     * @instance
     * @returns {String} path to this directory. relative to the MPD server's media root
     */
    me.getPath = function(){
        return source.directory;
    }

    /**
     * when was the directory last altered
     * @instance
     * @returns {Date} when the song file last altered
     */
    me.getLastModified = function(){
        return source.last_modified;
    };

    /**
     * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
     * @instance
     * @returns {Directory}
     */
    me.clone = function(){
        return MPD.Directory(client, source);
    };

    return me;

    /**
     * metadata returned about a directory from MPD
     * @typedef directory_metadata
     * @property {String} directory - file path relative to MPD's music folders
     * @property {Date} last_modified - last time this directory was modified
     */
}

/**
 * Generic playlist like interface. The Songlist function takes an object and returns
 * a Songlist object which representing a list of songs. This can be used to represent
 * the queue or a playlist
 * @class Songlist
 * @param {MPD} client - the MPD client object that owns this Songlist
 * @param {Object} source - configuration object that contains a list of songs
 */
MPD.Songlist = function(client, source){
     /**
      * @lends Songlist
      */
     var me = {};

     /**
      * given a song filename add it to this Songlist
      * @instance
      * @abstract
      * @param {String} pathname - relative path to the song file in the MPD database
      */
     me.addSongByFile = function(pathname){
         throw new Error('must be implemented by subclass!');
     };

     /**
      * remove all songs from this Songlist
      * @instance
      * @abstract
      */
     me.clear = function(){
         throw new Error('must be implemented by subclass!');
     };

     /**
      * remove a song as identified
      * @instance
      * @abstract
      * @param {Integer} position - position on the list of the song you want to remove
      */
     me.removeSongByPosition = function(position){
         throw new Error('must be implemented by subclass!');
     };

     /**
      * remove a song as identified
      * @instance
      * @abstract
      * @param {Integer} position - position on the list of the song you want to remove
      * @param {Integer} to - position on the list where you want the song to to be
      */
     me.moveSongByPosition = function(position, to){
         throw new Error('must be implemented by subclass!');
     };

     /**
      * swap two songs
      * @instance
      * @abstract
      * @param {Integer} position_a - position on the list of the song you want to move
      * @param {Integer} position_b - position on the list of the other song you want to move
      */
     me.swapSongsByPosition = function(position_a, position_b){
         throw new Error('must be implemented by subclass!');
     };

     /**
      * get the list of songs
      * @instance
      * @returns {Song[]}
      */
     me.getSongs = function(){
         return source.songs;
     };

     /**
      * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
      * @instance
      * @returns {Songlist}
      */
     me.clone = function(){
         return MPD.Songlist(client, source);
     };

     return me;
 }

/**
 * Object that represents a stored playlist
 * @class Playlist
 * @augments Songlist
 * @param {MPD} client - the MPD client object that owns this Songlist
 * @param {Object} source - configuration object that contains a list of songs
 * @param {String} playlist_name - the name of the playlist
 */
MPD.Playlist = function(client, source){
    var me = MPD.Songlist(client, source);

    me.addSongByFile = function(pathname){
        client.addSongToPlaylistByFile(me.getName(), pathname);
    };
    me.clear = function(){
        client.clearPlaylist(me.getName());
    };
    me.removeSongByPosition = function(position){
        client.removeSongFromPlaylistByPosition(me.getName(), position);
    };
    me.moveSongByPosition = function(position, to){
        client.moveSongOnPlaylistByPosition(me.getName(), position, to);
    };
    me.swapSongsByPosition = function(position_a, position_b){
        var first = Math.min(position_a, position_b);
        var last = Math.max(position_a, position_b);
        me.moveSongByPosition(first,last);
        me.moveSongByPosition(last,first);
    };

    /**
     * change the name of this playlist
     * @instance
     * @param {String} new_name -- the name this playlist should answer to from now on
     */
    me.rename = function(new_name){
        client.renamePlaylist(me.getName(), new_name);
        source.playlist = new_name;
    };

    /**
     * return the name of this playlist
     * @instance
     * @returns {String}
     */
    me.getName = function(){
        return source.playlist;
    }

    /**
     * append to queue
     */
    me.appendToQueue = function(){
        client.appendPlaylistToQueue(source.playlist);
    }

    /**
     * load into queue
     */
    me.loadIntoQueue = function(){
        client.loadPlaylistIntoQueue(source.playlist);
    }

    /**
     * delete this playlist, remove it from the MPD server completely
     * note this playlist will be invalid after calling this function,
     * but it will still have a clientside cache of what was in this playlist
     */
    me.delete = function(){
        client.deletePlaylist(source.playlist);
    }

    /**
     * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
     * @instance
     * @returns {Playlist}
     */
    me.clone = function(){
        return MPD.Playlist(client, source);
    };

    return me;
}

/**
 * Object that represents the queue
 * @class Queue
 * @augments Songlist
 * @param {MPD} client - the MPD client object that owns this Songlist
 * @param {Object} source - configuration object that contains a list of songs
 */
MPD.Queue = function(client, source){
   var me = MPD.Songlist(client, source);

   me.addSongByFile = function(pathname){
       client.addSongToQueueByFile(pathname);
   };
   me.clear = function(){
       client.clearQueue();
   };
   me.removeSongByPosition = function(position){
       client.removeSongFromQueueByPosition(position);
   };
   me.moveSongByPosition = function(position, to){
       client.moveSongOnQueueByPosition(position, to);
   };
   me.swapSongsByPosition = function(position_a, position_b){
       client.swapSongsOnQueueByPosition(position_a, position_b);
   };

   /**
    * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
    * @instance
    * @returns {Queue}
    */
   me.clone = function(){
       return MPD.Queue(client, source);
   };

   return me;
}

/**
 * An audio output that is available to be used
 * @class Output
 * @param {MPD} client - the MPD client object that owns this
 * @param {output_metadata} source - raw metadata javascript object that contains the MPD reported data for this output
 */
MPD.Output = function(client, source){
    var me = {};

    /**
     * get the MPD reported metadata, raw
     * @instance
     * @returns {output_metadata} gets all of the raw metadata MPD provided
     */
    me.getMetadata = function(){
        return JSON.parse(JSON.stringify(source));
    };

    /**
     * get the identifier for this output
     * @instance
     * @returns {Integer} numeric unique identifier of this output
     */
    me.getId = function(){
        return source.outputid;
    };

    /**
     * get the user facing name for this output
     * @instance
     * @returns {String} nice, descriptive, human friendly name for the output
     */
    me.getName = function(){
        return source.outputname;
    };

    /**
     * is this output making noise
     * @instance
     * @returns {Boolean} true if the output is enabled
     */
    me.isEnabled = function(){
        return client.outputIsEnabled(source.outputid);
    };

    /**
     * enables this output
     * @instance
     */
    me.enable = function(){
        return client.enableOutput(source.outputid);
    };

    /**
     * disables this output
     * @instance
     */
    me.disable = function(){
        return client.disableOutput(source.outputid);
    };

    /**
     * return a copy of this object. the point of this is to return an object that the used cannot use to mutate this one, but that has the exact same behaviour
     * @instance
     * @returns {Directory}
     */
    me.clone = function(){
        return MPD.Directory(client, source);
    };

    return me;

    /**
     * metadata returned about an output from MPD
     * @typedef output_metadata
     * @property {Integer} outputenabled
     * @property {Integer} outputid
     * @property {String} outputname
     */
}

/**
 * Is passed a playlist
 * @callback playlistCallback
 * @param {Playlist} playlist - a playlist
 */
/**
 * Lists all songs and directories in path (blank string for root). also returns song file metadata info
 * @callback directoryContentsCallback
 * @param {directory[]} [directory_contents] - the contents of the directory, will be an array of objects representing director(y|ies) and/or song(s) interleived
 */
/**
 * is given search results when the search is complete
 * @callback searchResultsCallback
 * @param {song[]} search_results - all of the songs that match the tag values you asked for
 */
/**
 * is passed the number of songs matching the given search criteria
 * @callback searchCountCallback
 * @param {Integer} search_result_count - number of songs matched by the tag values
 */

/**
 * event handler for 'Error' events
 * error event hander callback
 * @event Error
 * @type {Object}
 * @callback errorEventHandler
 * @param {Object} [responce_event] -
 * @param {MPD} client - the client that this event happened on
 */
 /**
  * event handler for 'AuthFailure' events
  * when we get a responce from MPD that we aren't allowed to do something
  * @event AuthFailure
  * @type {Object}
  * @callback errorEventHandler
  * @param {Object} [responce_event] -
  * @param {MPD} client - the client that this event happened on
  */
/**
 * generic event hander callback called when any sort of event happens
 * @event Event
 * @type {Object}
 * @callback eventHandler
 * @param {Object} [responce_event] - {type:String:data:Object} data depends onf type, see the other event handlers
 * @param {MPD} client - the client that this event happened on
 */
/**
 * generic event hander callback called when any sort of event happens that doesn't have any handler set for it
 * @event Event
 * @type {Object}
 * @callback unhandledEventHandler
 * @param {Object} [responce_event] - {type:String:data:Object} data depends onf type, see the other event handlers
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'DatabaseChanging' events
 * event hander callback for when the music database has started changing, there will be a DataLoaded event following this (unless something goes HORRIBLY wrong)
 * @event DatabaseChanging
 * @type {Object}
 * @callback databaseChangingEventHandler
 * @param {Object} [responce_event] -
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'DataLoaded' events
 * called when a bulk dataload has completed and the mpd client's data is in a ocnsistent state. fired when a client has finished recovering from a reload which might be caused by a database change or (re)connecting
 * @event DataLoaded
 * @type {Object}
 * @callback dataLoadedEventHandler
 * @param {state} state - state object, the same as is returned by getState
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'StateChanged' events
 * called when the state of the player has changed. This can be an scalar value. Things like currently playing song changing, volume, settings (consume, repeat, etc)
 * NOT called when the current play time changes, because that changes continuusly, you will need to poll that
 * @event StateChanged
 * @type {Object}
 * @callback stateChangedEventHandler
 * @param {state} state - state object, the same as is returned by getState
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'OutputChanged' events
 * called when an output of the player has changed (enabled/disabled).
 * @event OutputChanged
 * @type {Object}
 * @callback OutputChangedEventHandler
 * @param {Output[]} outputs - state object, the same as is returned by getState
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'QueueChanged' events
 * something about the queue of playing songs changed
 * @event QueueChanged
 * @type {Queue}
 * @callback queueChangedEventHandler
 * @param {Queue} queue - the new queue
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'PlaylistsChanged' events
 * some playlist somewhere changed. is an array of {playlist:String, last_modified:Date}
 * @event PlaylistsChanged
 * @type {Object[]}
 *
 * @callback playlistsChangedEventHandler
 * @param {array} [playlists] - [string] array of names of all playlists. note: there doesn't seem to be a way to get just the changed ones, so you get the list of everything, you can tell if something was added or removed but you have no way of telling if any particular playlist has been changed. this is a limitation of MPD
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'Connect' events
 * the client has connected, but no data has yet loaded
 * you can use this to setup event handlers, or just do that before connecting
 * @event Connect
 * @type {Object}
 * @callback connectEventHandler
 * @param
 * @param {MPD} client - the client that this event happened on
 */
/**
 * event handler for 'Disconnect' events
 * the client has disconnected
 * @event Disconnect
 * @type {Object}
 * @callback disconnectEventHandler
 * @param
 * @param {MPD} client - the client that this event happened on
 */
