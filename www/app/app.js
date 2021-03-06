	// FoundSound App code

	// Make sure you have set your secrets in the secrets.js file
	// better obfuscation strategy is required.

console.log('Reading app.js');

/* When this function is called, PhoneGap has been initialized and is ready to roll */
function onDeviceReady()
{
	console.log("Device is ready");	

		//Create a new oAuthLogin object for our soundcoud connection.
	soundcloud = new oAuthLogin({
															servicename: 'soundcloud', 
															authorize_url: 'http://soundcloud.com/connect', 
															redirect_uri: 'http://timhodson.com/sc_loginsuccess.html', 
															client_id: my_soundcloud_client_id,
															client_secret: my_soundcloud_client_secret,
															response_type: 'token',
															scope:'non-expiring',
															// set a callback for a successfull login event
															onLoggedIn: getSoundcloudUserDetails
															});
		// initiate the authentication
	soundcloud.authenticate();
	
}

	// This callback is used when we login with soundcloud to get the soundcloud user's details
var getSoundcloudUserDetails = function(e){
	console.log('Getting user details at event: '+ e );
	
	if(soundcloud.isLoggedIn()){
		
		var token_bits = soundcloud.getToken().split("-");
		
		var user_id = token_bits[2];
		var url = 'http://api.soundcloud.com/users/'+user_id+'.json?'
		var params = {client_id: soundcloud.client_id} ;
		
		console.log('getUserDetails() url:' + url);
		
		soundcloud.user = {};
		soundcloud.user.data = $.get(url, params, function(data){
																 console.log("Retrieved user details from soundcloud: " + JSON.stringify(data));
																 
																 console.log(' data.username: '+ data.username + 
																						 ' data.uri: ' + data.uri + 
																						 ' data.full_name: ' + data.full_name
																						 );
																 soundcloud.user.username = data.username;
																 soundcloud.user.uri = data.uri;
																 soundcloud.user.full_name = data.full_name;
																 
																 $("p#soundcloudStatus").html('Soundcloud: '+ soundcloud.user.username);
																 });
	}
}

	// A button will call this function from the UI
function captureAudio() {	
	
	if(soundcloud.isLoggedIn()){
		console.log("About to capture Audio as user: " + soundcloud.user.username );
		
			// create a new track object
		track = new Track();
		
			// register some functions to be called at certain events
		track.onUploadStart.subscribe(function(){	$.mobile.changePage('#uploading', {transition:'pop'}); });
		track.onUploadEnd.subscribe(function(){ $.mobile.changePage('#metadata', {transition:'fade'}); });
		track.onUploadEnd.subscribe(function(){ buildRDF(); });
		
			// initiate the capture process
			// individual parts of the process fire events (registered the handlers above)
		track.capture();
		
			// Create a new geo object which will contain the location of this recording.  
			// This object is self initiating.
		geo = new Geo();
		
	} else{
		console.log("Not capturing anything cause you ain't logged in");
			// TODO do something sensible here
	}
}



	// Simple string building function to create the necessary RDF.
	// Suggest this expanded to something more modular at some point as data needs grow.
function buildRDF(){
	
	console.log("Starting to build RDF");
	
	console.log("track "+track.uri);
	console.log("user "+soundcloud.user.uri);
	
	var latlong = geo.getStartLocation();
	
	console.log("lat "+latlong[0]);
	
	my_rdf = "<" + track.uri + "> <http://purl.org/dc/terms/title> \"" + track.title + "\" .\n" ;
 	my_rdf += "<" + track.uri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://foundsound.at/terms/FoundSound> .\n";
	my_rdf += "<" + track.uri + "> <http://foundsound.at/terms/recordedAt> <_:place1> .\n";
	my_rdf += "<_:place1> <http://www.w3.org/2003/01/geo/wgs84_pos#lat> \"" + latlong[0] + "\" .\n";
	my_rdf += "<_:place1> <http://www.w3.org/2003/01/geo/wgs84_pos#long> \"" + latlong[1] + "\" .\n";
	my_rdf += "<" + soundcloud.user.uri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .\n";
	my_rdf += "<" + soundcloud.user.uri + "> <http://xmlns.com/foaf/0.1/name> \"" + soundcloud.user.full_name + "\" .\n";
	my_rdf += "<" + soundcloud.user.uri + "> <http://foundsound.at/terms/recorded> \"" + track.uri  + "\" .\n";

	
	var url = 'http://api.kasabi.com/dataset/foundsound/store';
	var headers = {X_KASABI_APIKEY: my_kasabi_key};
	
	console.log(my_rdf);
	
	$.ajax({
				 type:'POST',
				 url: url,
				 headers: headers,
				 processData: false,
				 contentType: 'text/turtle',
				 data: my_rdf,
				 success: function(data){
						console.log('posted data to store '+ data);
						},
				 error: function(error){
						console.log('ERROR: posting data to store '+ data);
						}
				 });
	
}





	// Self initiating object for retrieving the devices current location
	// has an update function that could be called periodically.
	// results in a set of arrays with an index for each data point
	// provides getStartPosition and getEndPosition methods.
function Geo(){
	this.onGetLocationSuccess = new YAHOO.util.CustomEvent('get location success', this);
	this.onUpdateLocationSuccess = new YAHOO.util.CustomEvent('updated location success', this);
	this.onGetLocationFail = new YAHOO.util.CustomEvent('get location failed', this);
	
		// make our location data arrays
	this.lat = [];
	this.long = [];
	this.altitude = [];
	this.accuracy = [];
	this.altitudeAccuracy = [];
	this.heading = [];
	this.speed = [];
	this.timestamp = [];
	
		// get our location right away.	
	this.getLocation();
}

Geo.prototype.getLocation = function (){
	
	var that = this;
	var geoWin = function(position){
		that.storePosition(position);
		that.onGetLocationSuccess.fire();
	}
	
	var geoFail = function(positionError){
		console.log('Could not get position: Code: '+ positionError.code + ' Error:' + positionError.message);
		that.onGetLocationFail.fire();
	}

	
	navigator.geolocation.getCurrentPosition(geoWin, geoFail, { enableHighAccuracy: true });

}

Geo.prototype.update = function (){
	
	var that = this;
	var geoUpdateWin = function(position){
		that.storePosition(position);
		that.onUpdateLocationSuccess.fire();
	}
	
	var geoFail = function(positionError){
		console.log('Could not get position: Code: '+ positionError.code + ' Error:' + positionError.message);
		that.onGetLocationFail.fire();
	}


	navigator.geolocation.getCurrentPosition(geoUpdateWin, geoFail, { enableHighAccuracy: true });
	
}

Geo.prototype.storePosition = function(position){
	console.log('\nLatitude: '          + position.coords.latitude          + '\n' +
							'Longitude: '         + position.coords.longitude         + '\n' +
							'Altitude: '          + position.coords.altitude          + '\n' +
							'Accuracy: '          + position.coords.accuracy          + '\n' +
							'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
							'Heading: '           + position.coords.heading           + '\n' +
							'Speed: '             + position.coords.speed             + '\n' +
							'Timestamp: '         + new Date(position.timestamp)      + '\n');
	
	this.lat.push(position.coords.latitude);
	this.long.push(position.coords.longitude);
	this.altitude.push(position.coords.altitude);
	this.accuracy.push(position.coords.accuracy);         
	this.altitudeAccuracy.push(position.coords.altitudeAccuracy);
	this.heading.push(position.coords.heading);
	this.speed.push(position.coords.speed);
	this.timestamp.push(position.timestamp);	
}

Geo.prototype.getStartLocation = function(){
	var out = [this.lat[0], this.long[0]];
	console.log("Output:" + typeof(out));
	return out;
}

Geo.prototype.getEndLocation = function(){
	var len = this.lat.length - 1;
	var out =  [this.lat[len], this.long[len]];
	console.log("Output:" + typeof(out));
	return out;
}






	// The Track object will capture and upload a recording to soundcloud
	// Several events are fired during the execution of the various stages so that user feedback can be hooked in.
function Track(){
	console.log("Created a new track object");
	
		// define some events that this object will trigger
	this.onCaptured = new YAHOO.util.CustomEvent('track captured', this);
	this.onCaptureStart = new YAHOO.util.CustomEvent('track capture started', this);
	this.onCaptureEnd = new YAHOO.util.CustomEvent('track capture ended', this);
	this.onUploadStart = new YAHOO.util.CustomEvent('track upload started', this);
	this.onUploadEnd = new YAHOO.util.CustomEvent('track upload ended', this);
	this.onTrackUploaded = new YAHOO.util.CustomEvent('track uploaded', this);
	this.onRdfUploaded = new YAHOO.util.CustomEvent('track RDF uploaded', this);
	
	this.onCaptureStart.subscribe(function(e){ console.log("Event Fired: "+ e); });
	this.onCaptureEnd.subscribe(function(e){ console.log("Event Fired: "+ e); });
	this.onUploadStart.subscribe(function(e){ console.log("Event Fired: "+ e); });
	this.onUploadEnd.subscribe(function(e){ console.log("Event Fired: "+ e); });
	this.onTrackUploaded.subscribe(function(e){ console.log("Event Fired: "+ e); });	
	this.onRdfUploaded.subscribe(function(e){ console.log("Event Fired: "+ e); });
	
	this.onCaptureEnd.subscribe(this.uploadFile, this);
	
}

Track.prototype.capture = function(){
	this.onCaptureStart.fire();

		// because the success callback is modifying some of this objects properties, we need to keep the scope intact. 
	var that = this;
	var captureSuccess = function(mediaFiles){
		
		console.log("Captured something: " + typeof(mediaFiles));
		
		var i, len;
		for (i = 0, len = mediaFiles.length; i < len; i += 1) {
			console.log("i: " + i + " mediaFiles[i].fullpath: " + mediaFiles[i].fullPath);
				// we're only capturing 1 file at a time
			that.capturedFile = mediaFiles[i];
		}
		
		that.play(); // remove for live and provide a button
		
		that.onCaptureEnd.fire();
			//		console.log('PING PING PING');
	}	

	navigator.device.capture.captureAudio(captureSuccess, this.captureError, {limit: 2 });
	
}

Track.prototype.captureError = function(error){
	var msg = 'An error occurred during capture: ' + error.code;
	console.log(msg);
		//navigator.notification.alert(msg, null, 'Uh oh!');
	$.mobile.changePage('#captureError',{transition:'pop'});

}

Track.prototype.play = function(){
	
	
	var file = new Media(this.capturedFile.fullPath, 
						// success callback
						function() {
						console.log("Created Media object OK");
						},
						// error callback
						function(err) {
						console.log("Error creating Media object: " + err);
						});			
	
	file.play();
}

	// Upload files to server
Track.prototype.uploadFile = function() {
	
	var trackName = this.capturedFile.name + ' uploaded by FoundSound';
	console.log("About to upload to soundcloud: " + typeof(this.capturedFile) + " Track Name: " + trackName );
	
		// start uploading event
	this.onUploadStart.fire();
	
	
		//define our callback here so as to keep 'this' in scope
	var that = this;
	var uploadSuccess = function(r) {
		console.log("r ia an: "+typeof(r));
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);
		
		that.response = $.parseJSON(r.response);
		
		that.title = that.response.title;
		that.uri = that.response.uri;
		
		console.log("this track title "+that.title);
		console.log("this track uri "+that.uri);
		
		that.onUploadEnd.fire();
	}
	
		// phonegap provides a FileTransfer object to allow us to upload files
	var options = new FileUploadOptions();
	options.fileKey = 'track[asset_data]';
	options.fileName = this.capturedFile.name;
	options.mimeType ='audio/wav';
	
	var params = {
	oauth_token:  soundcloud.getToken() ,
		'track[title]': trackName,
		'track[sharing]': 'public'
	};
	
	options.params = params ;
	
	var ft = new FileTransfer();
	
	ft.upload(this.capturedFile.fullPath, 'https://api.soundcloud.com/tracks.json', uploadSuccess, this.uploadFail, options);
}

Track.prototype.uploadFail = function(error) {
	alert("An error has occurred: Code = " = error.code);
}








	// oAuthLogin is an object that we should be able to use to login for any oauth2 enabled service
	// TODO test with foursquare
function oAuthLogin(params) {
	console.log("Created a new oAuthLogin object with params: " + JSON.stringify(params) );
	
	this.servicename		= params.servicename || 'foundsound';
	this.authorize_url	= params.authorize_url;
	this.redirect_uri		= params.redirect_uri;
	this.client_id			= params.client_id;
	this.response_type	= params.response_type || 'token' ;
	this.scope					= params.scope || 'non-expiring';
	this.fnOnLoggedIn		= params.onLoggedIn ;
	
	this.isLoggedIn = false;
	this.access_token = '';

		// define some events
	this.onLoggedIn = new YAHOO.util.CustomEvent('logged in');
	
	if(typeof(this.fnOnLoggedIn) === 'function'){
		console.log("We have a function");
		this.onLoggedIn.subscribe(this.fnOnLoggedIn);
	} else {
		console.log("We should be getting a function for this var instead of: "+ typeof(params.onLoggedIn));
	}
	
	this.onLoggedIn.subscribe(function(type){
														console.log("onLoggedIn event triggered: event type: " + type);
														});
	
	this.onLoggedOut = new YAHOO.util.CustomEvent('logged out');
	
}
	// Check to see if user is already logged in
oAuthLogin.prototype.authenticate = function(){
		// see if user is alredy logged in?
	console.log("Checking to see if user is logged in...");
	
	if(this.haveTriedLocalToken === false ,this.access_token == undefined || this.access_token == ''){
		console.log("trying to get an existing key");
		this.getKey('oauth_token_' + this.servicename);
	}
	
	if(this.haveTriedLocalToken === true && ( this.access_token == undefined || this.access_token == '' )){
			// TODO this needs to be conditional with the above somehow, and include refresh token support?
		console.log("Going to try a normal login...");
		this.login();
	}
}

oAuthLogin.prototype.login = function(){
	console.log('Trying to log in');
	
	var url = this.authorize_url + "?";
	url += "client_id=" +this.client_id;
	url += "&redirect_uri=" + this.redirect_uri;
	url += "&response_type=" + this.response_type;
	url += "&scope=" + this.scope;
	
	this.client_browser = ChildBrowser.install();
	var that = this;
	this.client_browser.onLocationChange = function(loc){ that.locChanged(loc); };
	this.client_browser.onClose = function(){
		console.log("oAuthLogin.login(): child browser closed");
	};
	
	if(this.client_browser != null) {
		console.log("oAuthLogin.login(): About to log in using URL: " + url);
		window.plugins.childBrowser.showWebPage(url);
	}else{
		console.log("oAuthLogin.login(): Child browser is null for some reason");
	}
}

oAuthLogin.prototype.locChanged = function(loc){	
	/* Here we check if the url is the login success */
	console.log("oAuthLogin.locChanged(): Location Changed to: " + loc);
	
	if (loc.indexOf(this.redirect_uri) > -1) {
		
		var acCode = loc.match(/access_token=([^&]*)(&.*$|$)/)[1] ;
		if(acCode != '' || acCode != undefined ){
			this.client_browser.close(); 
			
			console.log("oAuthLogin.locChanged(): Access Token is " + acCode);
			
				// Store the key in the iOS keychain
			this.setKey('oauth_token_' + this.servicename, acCode);
			this.isLoggedIn = true;
			this.access_token = acCode;
			
				// TODO get a refresh token for if this token expires)

				//onLoggedIn
			this.onLoggedIn.fire();
			
		}else{
				// something didn't work so we will make sure the token is unset.
			console.log("soundcloudLocChanged(): something didn't work: " + acCode);
			removeKey('oauth_token_' + this.servicename);
		}
	}
}
	// Should be calling this method rather than the same named property.
	// TODO make sure using method not property.
oAuthLogin.prototype.isLoggedIn = function(){
	if(this.isLoggedIn === false){
		console.log("isLoggedIn(): NOT LOGGED IN");
		return false;
	}else if(this.isLoggedIn === true){
		console.log("isLoggedIn(): LOGGED IN");
		return true;
	}else{
			// any other value means we are not reliably logged in.
		console.log("isLoggedIn(): NOT LOGGED IN (fallback)");
		return false;
	}
}

oAuthLogin.prototype.getToken = function(){
	return this.access_token;
}

oAuthLogin.prototype.refresh_token = function(){
		// do something about getting refresh tokens here...
		
}

oAuthLogin.prototype.logout = function(){
	console.log("oAuthLogin.logout() Logging out");
	this.removeKey('oauth_token_' + this.servicename);
	this.isLoggedIn = false;
	this.onLoggedout.fire();
}

	//Keychain accessor functions
oAuthLogin.prototype.getKey = function(key, servicename)
{	
	servicename = servicename || 'foundsound';
	var that = this;
	var win = function(key, value) {
	 	console.log("GET SUCCESS - Key: " + key + " Value: " + value);
			//		callback(value);
		that.access_token = value;
		that.isLoggedIn = true;
		that.onLoggedIn.fire();
	};
	var fail = function(key, error) {
		console.log("GET FAIL - Key: " + key + " Error: " + error);
			//		callback('');
		that.isLoggedIn = false;
		that.login();
	};
	window.plugins.keychain.getForKey(key, servicename, win, fail);	
}

oAuthLogin.prototype.setKey = function(key, value, servicename)
{	
	servicename = servicename || 'foundsound';
	var win = function(key) {
		console.log("SET SUCCESS - Key: " + key);
	};
	var fail = function(key, error) {
		console.log("SET FAIL - Key: " + key + " Error: " + error);
	};
	
	window.plugins.keychain.setForKey(key, value, servicename, win, fail);
}

oAuthLogin.prototype.removeKey = function(key, servicename)
{
	servicename = servicename || 'foundsound';
	var that = this;
	var win = function(key) {
		console.log("REMOVE SUCCESS - Key: " + key);
		that.isLoggedIn = false;
	};
	var fail = function(key, error) {
		console.log("REMOVE FAIL - Key: " + key + " Error: " + error);
	};
	
	window.plugins.keychain.removeForKey(key, servicename, win, fail);
}