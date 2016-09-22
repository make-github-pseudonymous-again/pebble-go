/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */


var UI = require('ui');
var Vector2 = require('vector2');


var ajax = require('ajax');
var Vibe = require('ui/vibe');

var BUSY = false ;
var TIMESTAMP = 0 ;
var TKO = 60000 ;
var STOP_ID = null ;
var LINE_ID = null ;
var STOP_INDEX = null ;
var LINE_INDEX = null ;
var ERROR = null ;
var DATA = null ;

var TIMEOUT = null;

var BOK = '#55AA55' ;
var BLO = '#FFFF55' ;
var BKO = '#FF0055' ;
var FOK = '#FFFFFF' ;
var FLO = '#000000' ;
var FKO = '#FFFFFF' ;

var main = new UI.Window({
	scrollable: false,
	status: {
		separator : 'none',
		color: FKO,
		backgroundColor: BKO
	}
});

var size = main.size();
var w = size.x ;
var h = size.y ;

var background = new UI.Rect({
 position: new Vector2(0, 0),
 size: new Vector2(w, h),
 backgroundColor: '#FFFFFF'
});

main.add(background);

var fstop = new UI.Text({
 position: new Vector2(25, 0),
 size: new Vector2(w - 50, 20),
 font: 'gothic-24-bold',
 backgroundColor: 'none',
 color: '#000000' ,
 textAlign: 'center',
 textOverflow: 'ellipsis'
});
		 
var fnumber = new UI.Text({
 position: new Vector2(17, 30),
 size: new Vector2(32, 32),
 font: 'gothic-24-bold',
 textAlign: 'center',
 textOverflow: 'fill'
});

var fmessage = new UI.Text({
 position: new Vector2(17, 30),
 size: new Vector2(w - 34, h - 30),
 font: 'gothic-24-bold',
 color: BKO ,
 textAlign: 'center',
 textOverflow: 'wrap'
});
		 
var fline = new UI.Text({
 position: new Vector2(54, 30),
 size: new Vector2(w-64, 20),
 font: 'gothic-24-bold',
 color: '#000000' ,
 textAlign: 'left',
 textOverflow: 'ellipsis'
});

var fminutes = new UI.Text({
 position: new Vector2(0,72),
 size: new Vector2(w, 30),
 font: 'bitham-42-bold',
 text: '',
 color: '#555555' ,
 backgroundColor: 'none',
 textAlign: 'center',
 textOverflow: 'fill'
});

main.show();

function api ( lat , lon ) {
	var n = 10 ;
	var m = 30 ;
	return 'https://stib-mivb-api.herokuapp.com/realtime/nclosest/' + n + '/' + lat + '/' + lon + '?max_requests=' + m ;
}

function ad ( f ) {
	if ( main.index(f) < 0 ) main.add(f);
}

function rm ( f ) {
	f.text('');
	if ( main.index(f) >= 0 ) main.remove(f);
}

function _display ( ) {
	
	STOP_ID = DATA.stops[STOP_INDEX].id ;
	
	if ( DATA.stops[STOP_INDEX].realtime.error ) {
		fstop.text( DATA.stops[STOP_INDEX].name );
		fmessage.text( DATA.stops[STOP_INDEX].realtime.message );
		rm(fnumber);
		rm(fline);
		rm(fminutes);
		ad(fmessage);
		ad(fstop);
		return ;
	}
	
	if ( DATA.stops[STOP_INDEX].realtime.results.length === 0 ) {
		fstop.text( DATA.stops[STOP_INDEX].name );
		fmessage.text( 'nothing right now' );
		rm(fnumber);
		rm(fline);
		rm(fminutes);
		ad(fmessage);
		ad(fstop);
		return ;
	}
	
	LINE_ID = DATA.stops[STOP_INDEX].realtime.results[LINE_INDEX].line ;
	
	var next = DATA.stops[STOP_INDEX].realtime.results[LINE_INDEX] ;
	
	fstop.text( DATA.stops[STOP_INDEX].name ) ;
	fnumber.text(next.line) ;
	fnumber.backgroundColor(next.bgcolor) ;
	fnumber.color(next.fgcolor) ;
	fline.text(next.destination) ;
	fminutes.text(next.minutes) ;
	
	rm(fmessage);
	ad(fstop);
	ad(fnumber);
	ad(fline);
	ad(fminutes);

	if ( next.minutes === 0 ) Vibe.vibrate('double');
}

function prev ( ) {
	if ( !DATA.stops[STOP_INDEX].realtime.error ) {
		--LINE_INDEX ;
		if ( LINE_INDEX < 0 ) {
			LINE_INDEX = DATA.stops[STOP_INDEX].realtime.results.length - 1 ;
		}
	}
	_display ( ) ;
}

function next ( ) {
	if ( !DATA.stops[STOP_INDEX].realtime.error ) {
		++LINE_INDEX ;
		if ( LINE_INDEX >= DATA.stops[STOP_INDEX].realtime.results.length ) {
			LINE_INDEX = 0 ;
		}
	}
	_display ( ) ;
}

function other ( ) {
	++STOP_INDEX ;
	LINE_INDEX = 0 ;
	if ( STOP_INDEX >= DATA.stops.length ) {
		STOP_INDEX = 0 ;
	}
	_display ( ) ;
}

function handle_error ( title , message ) {
	if ( Date.now() - TIMESTAMP < TKO ) {
		bindnav();
		main.status('color', FOK);
		main.status('backgroundColor', BOK);
		TIMEOUT = setTimeout( load , 30000 ) ;
		return ;
	}
	main.status('color', FKO);
	main.status('backgroundColor', BKO);
	fstop.text( title );
	fmessage.text( message );
	rm(fnumber);
	rm(fline);
	rm(fminutes);
	ad(fmessage);
	ad(fstop);
	bindload();
}

function query ( position ) {
	
	var lat = position.coords.latitude;
	var lon = position.coords.longitude;
	
	ajax({ url: api(lat,lon), type: 'json' },
	  function(data, status, request) {
		ERROR = null ;
		
		DATA = data ;
		STOP_INDEX = 0 ;
		LINE_INDEX = 0 ;
		if ( STOP_ID !== null ) {
			var m = DATA.stops.length ;
			for ( var i = 0 ; i < m ; ++i ) {
				if ( DATA.stops[i].id === STOP_ID ) {
					STOP_INDEX = i ;
					if ( LINE_ID !== null ) {
						
						var realtime = DATA.stops[i].realtime;
						
						if ( realtime.error ) break ;
						var results = realtime.results ;
						
						var n = results.length ;
						for ( var j = 0 ; j < n ; ++j ) {
							if ( results[j].line === LINE_ID ) {
								LINE_INDEX = j ;
								break ;
							}
						}
					}
					break;
				}
			}
		}
		_display();
	    bindnav();
		main.status('color', FOK);
		main.status('backgroundColor', BOK);
		TIMESTAMP = Date.now();
		TIMEOUT = setTimeout( load , 30000 ) ;
	  },
	  function(data, status, request) {
		handle_error('API failed ' + status , data.message ) ;
	  }
	);
}

function geofail(){
	handle_error('ERROR', 'could not load geolocation :(');
}

function load(){
	
	if ( BUSY ) return ;
	
	BUSY = true ;
	
	if ( TIMEOUT !== null ) {
		clearTimeout(TIMEOUT);
		TIMEOUT = null ;
	}
	
	main.status('color', FLO ) ;
	main.status('backgroundColor', BLO ) ;
	
	if(navigator && navigator.geolocation){
		var opts = {maximumAge:60000, timeout:5000, enableHighAccuracy:true};
		navigator.geolocation.getCurrentPosition(query, geofail, opts);
	}
	else{
		handle_error('ERROR', 'navigator not enabled :(');
	}
}

function bindload ( ) {
	
	unbind();

	main.on('click', 'select', function(e) { load() ; } ) ;
	main.on('click', 'down', function(e) { load() ; } ) ;
	main.on('click', 'up', function(e) { load() ; } ) ;
	main.on('longClick', 'select', function(e) { load() ; } ) ;
	main.on('longClick', 'down', function(e) { load() ; } ) ;
	main.on('longClick', 'up', function(e) { load() ; } ) ;
	
	BUSY = false ;
	
}

function bindnav ( ) {
	
	unbind();
	
	main.on('click', 'select', function(e) { other() ; } ) ;
	main.on('click', 'down', function(e) { next() ; } ) ;
	main.on('click', 'up', function(e) { prev() ; } ) ;
	main.on('longClick', 'select', function(e) { load() ; } ) ;
	main.on('longClick', 'down', function(e) { load() ; } ) ;
	main.on('longClick', 'up', function(e) { load() ; } ) ;

	main.on('hide', function(){
		if ( TIMEOUT !== null ) {
			clearTimeout(TIMEOUT);
			TIMEOUT = null ;
		}
	});

	main.on('show', function(){
		load();
	});
	
	BUSY = false ;
}

function unbind ( ) {
	
	try{
		main.off('click');
	}
	catch(e){
	}
	try{
		main.off('longClick');
	}
	catch(e){
	}
	try{
		main.off('hide');
	}
	catch(e){
	}
	try{
		main.off('show');
	}
	catch(e){
	}
	
}

load();