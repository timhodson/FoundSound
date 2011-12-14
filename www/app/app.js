	// SoundAt App code

console.log('Reading app.js');


function soundcloudLogin(){
	console.log("Attempting to login");
	var my_client_id = "c45608d987cdd8ac1e9869930c3d8304", my_redirect_uri = "http://timhodson.com/sc_loginsuccess.html";
	
	var authorize_url = "https://soundcloud.com/connect?";
	authorize_url += "client_id=" + my_client_id;
	authorize_url += "&redirect_uri=" + my_redirect_uri;
	authorize_url += "&response_type=token";
	
	client_browser = ChildBrowser.install();
	client_browser.onLocationChange = function(loc){
		soundcloudLocChanged(loc);
	};
	if (client_browser != null) {
		window.plugins.childBrowser.showWebPage(authorize_url);
	}else{
		console.log("Child Browser is null for some reason");
	}
};

function soundcloudLocChanged(loc){
	/* Here we check if the url is the login success */
	console.log("Location Changed to: "+loc);
	if (loc.indexOf("http://timhodson.com/sc_loginsuccess.html") > -1) {
		
		var acCode = loc.match(/access_token=(.*)$/)[1] ;
		if(acCode != ''){
			client_browser.close(); 
		}
		console.log("Access Token is " + acCode);
		setKey('oauth_token', acCode);
		
		}
}





	// Child browser code
	/* When this function is called, PhoneGap has been initialized and is ready to roll */
function onDeviceReady()
{
	
	
	
		
//	var cb = ChildBrowser.install();
//	if(cb != null && 1==0)
//		{
//		cb.onLocationChange = function(loc){ locChanged(loc); };
//		cb.onClose = function(){ onCloseBrowser()};
//		cb.onOpenExternal = function(){ onOpenExternal();};
//		
//		window.plugins.childBrowser.showWebPage("http://timhodson.com");
//		
//		}
//	
//	var msg = function(){navigator.notification.alert("Connected to SoundCloud for the first time");} ;
//	
//		// SoundCloud code
//		SC.initialize({
//								client_id: "c45608d987cdd8ac1e9869930c3d8304",
//								redirect_uri: "http://timhodson.com/sc_callback.html",
//								});
//	
//	if(SC.isConnected()){
//		console.log("Logged in");
//
//		navigator.notification.alert("Connected to SoundCloud already");
//	}else{
//		console.log("Not logged in yet: %o",SC);
//		SC.connect({
//							 connected: msg
//							 });
//	}
}

function onCloseBrowser()
{
	alert("In index.html child browser closed");
}

function locChanged(loc)
{
	alert("In index.html new loc = " + loc);
}

function onOpenExternal()
{
	alert("In index.html onOpenExternal");
}


	//Keychain accessor functions
function getKey(key, servicename)
{	
	var win = function(key, value) {
		console.log("GET SUCCESS - Key: " + key + " Value: " + value);
	};
	var fail = function(key, error) {
		console.log("GET FAIL - Key: " + key + " Error: " + error);
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
	var win = function(key) {
		console.log("REMOVE SUCCESS - Key: " + key);
	};
	var fail = function(key, error) {
		console.log("REMOVE FAIL - Key: " + key + " Error: " + error);
	};
	
	window.plugins.keychain.removeForKey(key, servicename, win, fail);
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
		
		mymedia.play();
		
		uploadFile(mediaFiles[i]);
		
	}       
}

	// Called if something bad happens.
	// 
function captureError(error) {
	var msg = 'An error occurred during capture: ' + error.code;
	navigator.notification.alert(msg, null, 'Uh oh!');
}

	// A button will call this function
	//
function captureAudio() {
    // Launch device audio recording application, 
    // allowing user to capture up to 2 audio clips
		
//	for (i=0 , len = capture.supportedAudioModes.length, i <= len , i += 1){
//		console.log("Supported Audio Mode:"+capture.supportedAudioModes[i]);
//	}
		
		//TODO Check the user is logged in - if not got to #login
	
	navigator.device.capture.captureAudio(captureSuccess, captureError, {limit: 2, mode: '.mp3'});
}

	// Upload files to server
function uploadFile(mediaFile) {
//	var token = getKey('oauth_token');
//	var data = { 
//	oauth_token: token ,
//		track[asset_data]: '@'
//	};
//	$.post('https://api.soundcloud.com/tracks.json', options);
}

