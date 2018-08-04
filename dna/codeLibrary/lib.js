
function genesis () {
    return true;
}

function json( d, f ) {
    return JSON.stringify( d, null, f === undefined ? 4 : f );
}
function log() {
    debug( Date() +' - codelib/zome.js: '+ [].slice.call(arguments).join(' ') );
}


function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
	return v.toString(16);
    });
}

function is_dict( ctx ) {
    return (
	ctx !== null
	    && typeof ctx === 'object'
	    && ctx.constructor.name === 'Object'
    );
}


function update_object( args ) {
    // 'use strict';
    var target			= args[0];
    if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
    }

    var to			= Object(target);

    for (var index = 1; index < args.length; index++) {
        var nextSource		= args[index];

        if (nextSource != null) {
	    for (var nextKey in nextSource) {
		if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
		    to[nextKey]	= nextSource[nextKey];
		}
	    }
        }
    }
    return to;
}


function getAllEntries() {
    log("Getting all entries");

    var result = query({
	// Return: {
	//     Hashes: true,
	//     Entries: true
	// },
	// Constrain: {
	//     EntryTypes: ["task"]
	// }
	Return: {
	    Hashes: true,
	}
    });

    log("Result", typeof result, result.constructor.name, json(result));

    data			= JSON.parse( json(result) );
    log("data", json(data) );

    for (var i = 1; i < data.length; i++) {
	var hash		= data[i];
	log("Get value of hash", hash);
	var value		= get( hash );
	var links		= getLinks( hash, '' );
	log( json(value) );
	log( json(links) );
    }

    return result;
}
