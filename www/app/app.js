	// FoundSound App code

console.log('Reading app.js');


	// our User
var user = new Object();

var track = new Object();


/* When this function is called, PhoneGap has been initialized and is ready to roll */
function onDeviceReady()
{
	authenticateUser(user);
		// wait for the authentication check...
	setTimeout('if(!user.isLoggedIn){soundcloudLogin();}else{console.log("User is already logged in")}',500);
	
}



function soundcloudLogin(){
	console.log("Attempting to login");
	var my_client_id = "c45608d987cdd8ac1e9869930c3d8304";
	var my_redirect_uri = "http://timhodson.com/sc_loginsuccess.html";
	
	var authorize_url = "https://soundcloud.com/connect?";
	authorize_url += "client_id=" + my_client_id;
	authorize_url += "&redirect_uri=" + my_redirect_uri;
	authorize_url += "&response_type=token";
	
	client_browser = ChildBrowser.install();
	client_browser.onLocationChange = function(loc){ soundcloudLocChanged(loc); };
	client_browser.onClose = function(){
		console.log("Child browser closed");
			//console.log("soundcloudLogin(): getKey(): token = "+ getKey('oauth_token', function(token){return token;}));
//		if(user.isLoggedIn){
//			if(callback && typeof(callback) === 'function'){
//				console.log("EEEEEEEEEEEEEEEE calling callback:"+callback);
//				callback.call(); 
//			}
//		}
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
			
		}else{
				// something didn't work so we will make sure the token is unset.
			console.log("soundcloudLocChanged(): something didn't work: " + acCode);
			removeKey('oauth_token');
		}
	}
}





	//Keychain accessor functions
function getKey(key, callback, servicename)
{	
	servicename = servicename || 'foundsound';
	var win = function(key, value) {
	 	console.log("GET SUCCESS - Key: " + key + " Value: " + value);
		callback(value);
	};
	var fail = function(key, error) {
		console.log("GET FAIL - Key: " + key + " Error: " + error);
		callback('');
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




	// A button will call this function
function captureAudio() {
    // Launch device audio recording application, 
    // allowing user to capture up to 2 audio clips	
	if(user.isLoggedIn){
		console.log("About to capture Audio");
		navigator.device.capture.captureAudio(captureSuccess, captureError, {limit: 2 });
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
		
//		getLocation();
		
		uploadFile(mediaFiles[i]);
		
	}       
}

	// Called if something bad happens when capturing.
	// TODO some sensible error checking.
	// 3 - there was no file captured
function captureError(error) {
	var msg = 'An error occurred during capture: ' + error.code;
	navigator.notification.alert(msg, null, 'Uh oh!');
}



	// Upload files to server
function uploadFile(mediaFile, trackName ) {
	
	trackName = trackName || mediaFile.name + ' uploaded by FoundSound';
	
	getKey('oauth_token', function(token){
				 
				 $.mobile.changePage('#uploading', {transition:'pop'});
				 
				 // phonegap provides a FileTransfer object to allow us to upload files
				 var win = function(r) {
					console.log("Code = " + r.responseCode);
					console.log("Response = " + r.response);
					console.log("Sent = " + r.bytesSent);
				 
					// don't like using alerts, but for now...
					navigator.notification.alert("Uploaded Successfully");
				 
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
				 
				 // can't use jquery for file uploads
				 
//				 var data = { 
//						oauth_token:  token ,
//						'track[asset_data]': filedata,
//						'track[title]': 'A test track',
//						'track[sharing]': 'private'
//						};
//				 
//				 console.log("About to post the track " + data);
//				 $.post('https://api.soundcloud.com/tracks.json', data , function(response){
//								console.log("POST reponse" + response);
//								});
	});
}


function getLocation(){
	
	var win = function(){
		
	}
	
	navigator.getCurrentPosition(win, fail, { enableHighAccuracy: true });
}


function authenticateUser(user){
	getKey('oauth_token',function(token){
			
			if(token != undefined && token != ''){
				 console.log("isLoggedIn(): LOGGED IN: "+ token);		
				 user.isLoggedIn = true;
			} else {
				 // make sure that we are really logged out
				 console.log("isLoggedIn(): NOT LOGGED IN: "+ token);
				 //removeKey('oauth_token');
				 user.isLoggedIn = false;
			}			 
	});	
}
