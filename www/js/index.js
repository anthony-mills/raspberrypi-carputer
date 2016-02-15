var gaplug;

function nativePluginResultHandler() {
    // handle GA tracking success
    console.log('Google tracking start');
}

function nativePluginErrorHandler() {
    // handle GA tracking error
    console.log("GA tracking error");
}

function track(category, action, label, value) {
    // generic google analytics tracking event
    console.log("track("+category+", "+action+", "+label+", "+value+")");
    if (gaplug) gaplug.trackEvent( nativePluginResultHandler, nativePluginErrorHandler, category, action, label, value);
}

var app = {
    
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {

    },
    onDeviceReady: function() {

    },
	openNativeAppWindow: function(data) {
	    window.open(data, '_system');
	}
};
