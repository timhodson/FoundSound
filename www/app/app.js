	// FoundSound App code

console.log('Reading app.js');

var my_client_id = "704b02acddd5d6e51f5cec6a0022d200";

	// our User
var user = new Object();
var track = new Object();
var geo = new Object();
var global_access_token = global_access_token || '';
if (global_access_token == ''){
	getKey('oauth_token');
}

/* When this function is called, PhoneGap has been initialized and is ready to roll */
function onDeviceReady()
{
	authenticateUser(user);
}



function soundcloudLogin(){
	console.log("Attempting to login");
	var my_redirect_uri = "http://timhodson.com/sc_loginsuccess.html";
	
	var authorize_url = "https://soundcloud.com/connect?";
	authorize_url += "client_id=" + my_client_id;
	authorize_url += "&redirect_uri=" + my_redirect_uri;
	authorize_url += "&response_type=token";
	authorize_url += "&scope=non-expiring";
	
	client_browser = ChildBrowser.install();
	client_browser.onLocationChange = function(loc){ soundcloudLocChanged(loc); };
	client_browser.onClose = function(){
		console.log("Child browser closed");
	};
	
	if(client_browser != null) {
		window.plugins.childBrowser.showWebPage(authorize_url);
	}else{
		console.log("soundcloudLogin(): Child browser is null for some reason");
	}
	
		
};

function soundcloudLogout(){
	console.log("Logging out");
	removeKey('oauth_token');
	user.isLoggedIn = false;
}

function soundcloudLocChanged(loc){	
	/* Here we check if the url is the login success */
	var my_redirect_uri = "http://timhodson.com/sc_loginsuccess.html";
	
	console.log("soundcloudLocChanged(): Location Changed to: "+loc);

	if (loc.indexOf(my_redirect_uri) > -1) {
		
		var acCode = loc.match(/access_token=([^&]*)&.*$/)[1] ;
		if(acCode != '' || acCode != undefined ){
			client_browser.close(); 
			
			console.log("soundcloudLocChanged(): Access Token is " + acCode);
			
				// Store the key in the iOS keychain
			setKey('oauth_token', acCode);
			user.isLoggedIn = true;
			global_access_token = acCode;
			
				// TODO get a refresh token for if this token expires)
			
			setTimeout(function(){ getUserDetails(user); }, 500);
			
		}else{
				// something didn't work so we will make sure the token is unset.
			console.log("soundcloudLocChanged(): something didn't work: " + acCode);
			removeKey('oauth_token');
		}
	}
}

function getUserDetails(user){
	console.log('Getting user details');
		//getKey('oauth_token', function(token){
	var token = global_access_token;
				 if(user.isLoggedIn){

				 var token_bits = token.split("-");

				 var user_id = token_bits[2];
				 var url = 'http://api.soundcloud.com/users/'+user_id+'.json?'
				 var params = {client_id: my_client_id} ;

				 console.log('getUserDetails() url:' + url);

				 user.data = $.get(url, params, function(data){
													 console.log('data:'+ data.username);
													 user.username = data.username;
													 user.uri = data.uri;
													 user.full_name = data.full_name;
													 
													 
													 $('#soundcloudStatus').html('Connected as '+user.username);
													 
													 });
				 }
		//});
}






	// A button will call this function
function captureAudio() {
    // Launch device audio recording application, 
    // allowing user to capture up to 2 audio clips	
	if(user.isLoggedIn){
		console.log("About to capture Audio");
		navigator.device.capture.captureAudio(captureSuccess, captureError, {limit: 2 });
	} else{
		console.log("Not capturing anything cause you ain't logged in");
	}
}

	// Called when capture operation is finished
	//
function captureSuccess(mediaFiles) {
	var i, len;
	for (i = 0, len = mediaFiles.length; i < len; i += 1) {
		
		mymedia = new Media(mediaFiles[i].fullPath, 
												// success callback
												function() {
												console.log("playAudio():Audio Success");
												},
												// error callback
												function(err) {
												console.log("playAudio():Audio Error: "+err);
												});
		
//		mymedia.play();
		
		getLocation();
		
		uploadFile(mediaFiles[i]);
		
		setTimeout(function(){buildRDF();},15000); //euuk! needs to be event based on successfull upload
		
	}       
}

	// Called if something bad happens when capturing.
	// TODO some sensible error checking.
	// 3 - there was no file captured
function captureError(error) {
	var msg = 'An error occurred during capture: ' + error.code;
	navigator.notification.alert(msg, null, 'Uh oh!');
	$.mobile.changePage('#captureError',{transition:'pop'});
}



	// Upload files to server
function uploadFile(mediaFile, trackName ) {
	
	trackName = trackName || mediaFile.name + ' uploaded by FoundSound';
	
		//getKey('oauth_token', function(token){
	var token = global_access_token;			
	
				 $.mobile.changePage('#uploading', {transition:'pop'});
				 
				 // phonegap provides a FileTransfer object to allow us to upload files
				 var win = function(r) {
					 console.log("Code = " + r.responseCode);
					 console.log("Response = " + r.response);
					 console.log("Sent = " + r.bytesSent);
					 
					 var response = $.parseJSON(r.response);
				 
					 track.title = response.title;
					 track.uri = response.uri;
				 
					 console.log("this track title "+track.title);
					 console.log("this track uri "+track.uri);
				 
					 $.mobile.changePage('#metadata', {transition:'fade'});
				 
				 }

				 var fail = function(error) {
				 alert("An error has occurred: Code = " = error.code);
				 }
				 
				 var options = new FileUploadOptions();
				 options.fileKey = 'track[asset_data]';
				 options.fileName=mediaFile.name;
				 options.mimeType='audio/wav';
				 
				 var params = {
					oauth_token:  token ,
					'track[title]': trackName,
					'track[sharing]': 'public'
				 };
				 
				 options.params = params ;
				 
				 var ft = new FileTransfer();
				 
				 ft.upload(mediaFile.fullPath, 'https://api.soundcloud.com/tracks.json', win, fail, options);
				 
		//	});
}


function getLocation(){
	
	var win = function(position){
		console.log('Latitude: '          + position.coords.latitude          + '\n' +
								'Longitude: '         + position.coords.longitude         + '\n' +
								'Altitude: '          + position.coords.altitude          + '\n' +
								'Accuracy: '          + position.coords.accuracy          + '\n' +
								'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
								'Heading: '           + position.coords.heading           + '\n' +
								'Speed: '             + position.coords.speed             + '\n' +
								'Timestamp: '         + new Date(position.timestamp)      + '\n');
		
		geo.lat = position.coords.latitude;
		geo.long = position.coords.longitude;		
		
	};
	var fail = function(positionError){
		console.log('Could not get position: Code: '+ positionError.code + ' Error:' + positionError.message);
	};
	
	navigator.geolocation.getCurrentPosition(win, fail, { enableHighAccuracy: true });
}


function buildRDF(){
	
	console.log("Starting to build RDF");
	
	console.log("track "+track.uri);
	console.log("user "+user.uri);
	console.log("lat "+geo.lat);
	
	my_rdf = "<" + track.uri + "> <http://purl.org/dc/terms/title> \"" + track.title + "\" .\n" ;
 	my_rdf += "<" + track.uri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://foundsound.at/terms/FoundSound> .\n";
	my_rdf += "<" + track.uri + "> <http://foundsound.at/terms/recordedAt> <_:place1> .\n";
	my_rdf += "<_:place1> <http://www.w3.org/2003/01/geo/wgs84_pos#lat> \"" + geo.lat + "\" .\n";
	my_rdf += "<_:place1> <http://www.w3.org/2003/01/geo/wgs84_pos#long> \"" + geo.long + "\" .\n";
	my_rdf += "<" + user.uri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .\n";
	my_rdf += "<" + user.uri + "> <http://xmlns.com/foaf/0.1/name> \"" + user.full_name + "\" .\n";
	my_rdf += "<" + user.uri + "> <http://foundsound.at/terms/recorded> \"" + track.uri  + "\" .\n";

	
	var url = 'http://api.kasabi.com/dataset/foundsound/store';
	var headers = {X_KASABI_APIKEY:'d2accb7a212917681eb0eb5cbf8f1245a5f636f7'};
	
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

	// Check the user is authenticated
function authenticateUser(user){
		//getKey('oauth_token',function(token){
	var token = global_access_token;
	
			if(token != undefined && token != ''){
				 console.log("isLoggedIn(): LOGGED IN: "+ token);		
				 user.isLoggedIn = true;
			} else {
				 // make sure that we are really logged out
				 console.log("isLoggedIn(): NOT LOGGED IN: "+ token);
				 //removeKey('oauth_token');
				 user.isLoggedIn = false;
			}			 
		//	});	
	
		// wait for the authentication check...
	setTimeout(function(){ if(!user.isLoggedIn){soundcloudLogin();}else{console.log("User is already logged in")} },500);	
		//populate user details
	setTimeout(function(){ getUserDetails(); }, 500);

}

	//Keychain accessor functions
function getKey(key, servicename)
{	
	servicename = servicename || 'foundsound';
	var win = function(key, value) {
	 	console.log("GET SUCCESS - Key: " + key + " Value: " + value);
			//		callback(value);
		global_access_token = value;
	};
	var fail = function(key, error) {
		console.log("GET FAIL - Key: " + key + " Error: " + error);
			//		callback('');
	};
	window.plugins.keychain.getForKey(key, servicename, win, fail);	
}

function setKey(key, value, servicename)
{	
	servicename = servicename || 'foundsound';
	var win = function(key) {
		console.log("SET SUCCESS - Key: " + key);
	};
	var fail = function(key, error) {
		console.log("SET FAIL - Key: " + key + " Error: " + error);
	};
	
	window.plugins.keychain.setForKey(key, value, servicename, win, fail);
	global_access_token = value;
}

function removeKey(key, servicename)
{
	servicename = servicename || 'foundsound';
	var win = function(key) {
		console.log("REMOVE SUCCESS - Key: " + key);
	};
	var fail = function(key, error) {
		console.log("REMOVE FAIL - Key: " + key + " Error: " + error);
	};
	
	window.plugins.keychain.removeForKey(key, servicename, win, fail);
}


