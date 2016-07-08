
var fs = require( 'fs' );
var spawn = require( 'child_process' ).spawn;
var util = require( 'util' );
var ypi = require( 'youtube-playlist-info' );

console.logNoNewLine = function LogNoNewLine() {

	// console.log without final "\n"

	this._stdout.write( util.format.apply( this, arguments ) );

};



var config = loadConfig();

if ( ! config ) {
	process.exit( 1 );
}

if ( ! config.apiKey ) {
	console.log( "Please insert your Youtube API KEY in the config.json file." );
	process.exit( 1 );
}

console.log( "Retrieving playlist information..." );

ypi.playlistInfo( config.apiKey , config.playlistId, function( playlistItems ) {

	//console.log( playlistItems );

	console.log( "Playlist has " + playlistItems.length + " videos." );

	// As the array already is ordered correctly, don't order by publish date since some videos are older than their publish date.
	//sortItems( playlistItems );

	obtainAudioURLs( playlistItems, function( errorVideos ) {

		if ( errorVideos.length > 0 ) {
			var errorInfo = "";
			for ( var i = 0; i < errorVideos.length; i++ ) {
				var item = playlistItems[ errorVideos[ i ].index ];
				errorInfo += "****************************************\n";
				errorInfo += "***** Video Id: " + item.resourceId.videoId + "\n";
				errorInfo += "***** Error output: " + errorVideos[ i ].errorOutput + "\n";
				errorInfo += "***** Video info below:\n";
				errorInfo += JSON.stringify( item, null, 4 ) + "\n";
				errorInfo += "*****\n";
				errorInfo += "****************************************\n";
			}
			// Write error file
			fs.writeFileSync( "./videoErrors.txt", errorInfo );
			console.log( "Error: unable to get audio URL for some of the videos (" + errorVideos.length + " of total " + playlistItems.length + ")" );
			console.log( "Info of the erroneous videos was saved on ./videoErrors.txt" );
			console.log( "Please consider updating your youtube-dl version." );
		}

		generateOutput( playlistItems );

	} );


} );

function loadConfig() {

	console.log( "Loading config file in ./config.json..." );

	try {
		var configFileContent = fs.readFileSync( "./config.json", "utf-8" );
	}
	catch( e ) {
		if ( e.code === 'ENOENT' ) {
			console.error( "Error: Config file not found (path: ./config.json)" );
		}
		else {
			throw e;
		}
	}

	var config = JSON.parse( configFileContent );

	if ( ! config ) {
		console.error( "Error while loading config file in ./config.json" );
		return null;
	}

	return config;

}

function obtainAudioURLs( playlistItems, onAllObtained ) {

	// onAllonAllObtained( errorVideosArray )

	var itemIndex = 0;
	var numItems = playlistItems.length;

	var errorVideos = [];

	var barSize = 20;
	var barMessage = "Retrieving audio URLs from the videos...";

	function iterateAsync() {

		if ( itemIndex < numItems ) {

			var videoURL = "https://youtube.com/watch?v=" + playlistItems[ itemIndex ].resourceId.videoId;

			getAudioURLFromVideo( videoURL, function( audioURL, errorOutput ) {

				if ( audioURL ) {

					if ( audioURL.endsWith( "\n" ) ) {
						audioURL = audioURL.substring( 0, audioURL.length - 1 );
					}

					playlistItems[ itemIndex ].resourceId.audioURL = audioURL;
					
				}
				else {

					playlistItems[ itemIndex ].resourceId.audioURL = null;

					errorVideos.push( { index: itemIndex, errorOutput: errorOutput } );
					
				}

				itemIndex++;

				console.logNoNewLine( getProgressBarText( itemIndex, numItems, barMessage, barSize ) );

				iterateAsync();

			} );

		}
		else {

			console.log( getProgressBarTextDelete( barMessage, barSize ) );

			onAllObtained( errorVideos );

		}

	}

	console.logNoNewLine( getProgressBarText( 0, numItems, barMessage, barSize ) );

	iterateAsync();

}

function getAudioURLFromVideo( videoURL, onEnd ) {

	// Returns a link to a media file with only the audio: onEnd( audioURL, errorOutput )

	var childOutput = "";
	var errorOutput = "";

	var params = [ "--get-url", "-f", "bestaudio", videoURL ];

	var childProcess = spawn( 'youtube-dl', params );

	childProcess.stdout.on( 'data', function( data ) {

		childOutput += data;

	} );

	childProcess.stderr.on( 'data', function( data ) {

		errorOutput += data;

	} );

	childProcess.on( 'close', function( code ) {

		onEnd( childOutput, errorOutput );

	});

}

function generateOutput( playlistItems ) {

	try {

		console.log( "Generating output file..." );

		var rssContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
		rssContent += "<rss version=\"2.0\" \n";
		rssContent +=
			"	xmlns:content=\"http://purl.org/rss/1.0/modules/content/\"\n" +
			"	xmlns:wfw=\"http://wellformedweb.org/CommentAPI/\"\n" +
			"	xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n" +
			"	xmlns:atom=\"http://www.w3.org/2005/Atom\"\n" +
			"	xmlns:sy=\"http://purl.org/rss/1.0/modules/syndication/\"\n" +
			"	xmlns:slash=\"http://purl.org/rss/1.0/modules/slash/\"\n" +
			"	>\n\n";


		rssContent += "<channel>\n";
		var titleLine = "<title>" + config.channelTitle + "</title>\n";
		var linkLine = "<link>" + config.channelURL + "</link>\n";
		rssContent += titleLine;
		rssContent += "<atom:link href=\"" + config.channelURL + "feed/\" rel=\"self\" type=\"application/rss+xml\" />\n";
		rssContent += linkLine;
		rssContent += "<description>" + config.channelDescription + "</description>\n";
		rssContent += "<language>" + config.language + "</language>";

		var numItems = 0;

		for ( var i = 0, il = playlistItems.length; i < il; i++ ) {

			var item = playlistItems[ i ];

			if ( ! item.resourceId.audioURL ) {
				continue;
			}

			rssContent += "<item>\n";
			rssContent += "<title><![CDATA[" + item.title + "]]></title>\n";
			rssContent += "<link><![CDATA[" + item.resourceId.audioURL + "]]></link>\n";
			rssContent += "<description><![CDATA[" + item.description + "]]></description>\n";
			rssContent += "<guid isPermaLink=\"false\">" + config.channelURL + ( i + 1 ) + "</guid>\n";
/*
			rssContent += "    <image>\n";
			rssContent += "        <url>" + item.thumbnails[ config.thumbnail ].url + "</url>\n";
			rssContent += "        " + titleLine;
			rssContent += "        " + linkLine;
			rssContent += "    </image>\n";
*/
			rssContent += "</item>\n";

			numItems++;
		}

		rssContent += "</channel>\n</rss>";

		// write output file
		fs.writeFileSync( config.outputPath, rssContent );

		console.log( "Finished writing RSS feed file: " + numItems + " items written.\nHave a good day." );

	}
	catch ( err ) {
		console.log( "Some error occured while processing the data: " + err );
	}

}

function getProgressBarText( progress, maxProgress, message, barSize ) {

	var line = "\r" + message + "[";

	var fraction = progress / maxProgress;

	var numProgressBars = Math.floor( fraction * barSize );

	for ( var i = 0; i < numProgressBars; i++ ) {
		line += "=";
	}
	for ( var i = numProgressBars; i < barSize; i++ ) {
		line += " ";
	}

	var percent = Math.floor( fraction * 100 );

	line += "] " + percent + "%";

	return line;
}

function getProgressBarTextDelete( message, barSize ) {

	var line = "";
	var n = message.length + barSize + 7;
	for ( var i = 0; i < n; i++ ) {
		line += " ";
	}
	return line;
}

function sortItems( playlistItems ) {

	console.log( "Sorting items..." );

	playlistItems.sort( function( a , b ) {

		if ( a.publishedAt < b.publishedAt ) {

			return 1;

		}
		else if ( a.publishedAt > b.publishedAt ) {

			return -1;

		}

		return 0;

	} );

}
