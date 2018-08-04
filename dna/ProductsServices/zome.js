
var entryTypeMap = {
    MU:			"measurement_unit",
    BU:			"base_unit",
    PS:			"price_sheet",
    PSU:		"price_sheet_unit",
    PSF:		"product_service",
    PSFU:		"product_service_unit",
    BU_MU:		"base_unit_to_measurement_unit",
    PSU_PS:		"price_sheet_unit_to_price_sheet",
    PSU_BU:		"price_sheet_unit_to_base_unit",
    PSFU_PSF:		"product_service_unit_to_product_service",
    PSFU_BU:		"product_service_unit_to_base_unit",
};
var entryTypeList	= Object.keys( entryTypeMap ).map(function(k) { return entryTypeMap[k]; });

var mu_struct = {
    "< Entry.category_type": {
	"name": "< Entry.category_type",
	"categories": {
	    "< Entry.category": {
		"name": "< Entry.category",
		"systems": {
		    "< Entry.system": {
			"name": "< Entry.system",
			"units": {
			    "< Entry.symbol": {
				"hash": "< Hash",
				"name": "< Entry.name",
				"symbol": "< Entry.symbol",
				"system": "< Entry.system",
				"plurals": {
				    "name": "< Entry.plural_name",
				    "symbol": "= this.Entry.plural_symbol || this.Entry.symbol",
				},
				"category": {
				    "name": "< Entry.category",
				    "type": "< Entry.category_type",
				}
			    }
			}
		    }
		}
	    }
	}
    }
};

var entryTypeStructs = {
    MU:			mu_struct,
};

function genesis () {
    return true;
}

function json( d, f ) {
    return JSON.stringify( d, null, f === undefined ? 4 : f );
}
function log() {
    debug( Date() +' - /zome.js: '+ [].slice.call(arguments).join(' ') );
}

function validateCommit (entry_type, entry, header, pkg, sources) {
    log("Validate commit for type", entry_type, json(entry) );

    return true;
}
function validatePut (entry_type, entry, header, pkg, sources) {
    return true;
}
function validateMod (entry_type, entry, header, replaces, pkg, sources) {
    return true;
}
function validateDel (entry_type, hash, pkg, sources) {
    return true;
}


function write( cmd ) {
    log( "Write input", cmd );
    var hash			= commit( entryTypeMap[ cmd.entryType ], cmd.entry );
    log( hash );

    cmd.entry.hash		= hash;
    
    return cmd.entry;
}

function add_base_unit( cmd ) {
    var mu_hash			= cmd.mu_hash;
    var BU_ET			= entryTypeMap[ 'BU' ];
    var LINK_ET			= entryTypeMap[ 'BU_MU' ];
    
    var hash			= commit( BU_ET, cmd.entry );
    
    commit( LINK_ET, {
    	Links: [{
    	    Base: mu_hash,
    	    Link: hash,
    	    Tag: BU_ET
    	}]
    });

    cmd.entry.hash		= hash;

    return cmd.entry;
}

function add_price_sheet( cmd ) {
    var PS_ET			= entryTypeMap[ 'PS' ];

    var hash			= commit( PS_ET, cmd.entry );
    cmd.entry.hash		= hash;

    return cmd.entry;
}

function add_price_sheet_unit( cmd ) {
    var ps_hash			= cmd.ps_hash;
    var bu_hash			= cmd.bu_hash;
    
    var PSU_ET			= entryTypeMap[ 'PSU' ];
    var PS_LINK_ET		= entryTypeMap[ 'PSU_PS' ];
    var BU_LINK_ET		= entryTypeMap[ 'PSU_BU' ];

    var hash			= commit( PSU_ET, cmd.entry );
    
    commit( PS_LINK_ET, {
    	Links: [{
    	    Base: ps_hash,
    	    Link: hash,
    	    Tag: PSU_ET
    	}]
    });
    
    commit( BU_LINK_ET, {
    	Links: [{
    	    Base: bu_hash,
    	    Link: hash,
    	    Tag: PSU_ET
    	}]
    });
    
    cmd.entry.hash		= hash;

    return cmd.entry;
}

function add_product_service( cmd ) {
    var PSF_ET			= entryTypeMap[ 'PSF' ];

    var hash			= commit( PSF_ET, cmd.entry );
    cmd.entry.hash		= hash;

    return cmd.entry;
}

function add_product_service_unit( cmd ) {
    var psf_hash		= cmd.psf_hash;
    var bu_hash			= cmd.bu_hash;
    
    var PSFU_ET			= entryTypeMap[ 'PSU' ];
    var PSF_LINK_ET		= entryTypeMap[ 'PSFU_PSF' ];
    var BU_LINK_ET		= entryTypeMap[ 'PSFU_BU' ];

    var hash			= commit( PSFU_ET, cmd.entry );

    log("ProductService hash:", psf_hash, json(cmd.entry) );
    
    commit( PSF_LINK_ET, {
    	Links: [{
    	    Base: psf_hash,
    	    Link: hash,
    	    Tag: PSFU_ET
    	}]
    });
    
    commit( BU_LINK_ET, {
    	Links: [{
    	    Base: hash,
    	    Link: bu_hash,
    	    Tag: PSFU_ET
    	}]
    });
    
    cmd.entry.hash		= hash;

    return cmd.entry;
}


function getAll( cmd ) {
    log("Given CMD", cmd, cmd.entryType, entryTypeMap, entryTypeMap[ cmd.entryType ]);
    
    var result			= query({
	Return: {
	    Hashes: true,
	    Entries: true
	},
	Constrain: {
	    EntryTypes: [ entryTypeMap[ cmd.entryType ] ]
	}
    });

    if ( entryTypeStructs[ cmd.entryType ] === undefined )
	return result;

    for ( var i in result ) {
	var entry		= result[i];
	entry.Links		= getLinks( entry.Hash, '', { Load: true } );
	log('Links for hash', entry.Hash, entry.Links);
    }

    var data			= JSON.parse( call("Restruct", "restruct", { data: result, struct: entryTypeStructs[ cmd.entryType ] }) );
    
    return data;
}

function getAllProducts( cmd ) {
    
    var result			= query({
	Return: {
	    Hashes: true,
	    Entries: true
	},
	Constrain: {
	    EntryTypes: [ entryTypeMap[ "PSF" ] ]
	}
    });

    for ( var i in result ) {
	var product		= result[i];
	log('ProductService hash', product.Hash);
	log('ProductService entry', product.Entry);
	product.Links		= getLinks( product.Hash, '', { Load: true } );
	log('ProductService links', product.Links);
    }

    return result;
}


function getSingle( cmd ) {
    var hash			= cmd.hash;
    var entryType		= entryTypeMap[ cmd.entryType ];
    log("Get data for hash", hash);
    var data			= get( hash );
    log("Got data", data);
    return json(data, 0);
}

function updateItem( input ) {
    var prevHash		= input.hash;
    var entryType		= entryTypeMap[ input.entryType ];
    var data			= input.entry;
    log("Update commit", prevHash, data);
    var hash			= update( entryType, data, prevHash );
    log("Updated hash", hash);
    data.hash			= hash;
    return data;
}

function archive( cmd ) {
    var hash			= cmd.hash;
    var entryType		= entryTypeMap[ cmd.entryType ];
    
    log("Remove hash", hash);
    var hash			= remove( hash, "Archive " + entryType );
    log("Success result", hash);
    return hash;
}
