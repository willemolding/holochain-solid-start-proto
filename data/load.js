
const measurement_units				= require('./mu.json');
const base_units				= require('./bu.json');
const price_sheet				= require('./ps.json');
const products					= require('./psf.json');
const request					= require('request-promise-native');

function e(err) {
    console.error( err );
}

async function add( fn, data ) {
    var options = {
	method: 'POST',
	uri: 'http://localhost:4141/fn/ProductsServices/'+fn,
	body: data,
	json: true
    };

    return await request(options);
}


const Storage = {
    "MU":	{ symbol: {} },
    "BU":	{ name: {} },
    "PSU":	{ name: {} },
    "PSFU":	{ name: {} },
};


async function create_mus() {
    for ( var unit of measurement_units ) {
	var entry				= await add( 'write', {
	    "entryType": "MU",
	    "entry": unit
	});
	
	console.log(entry);
	Storage.MU.symbol[ unit.symbol ]	= entry.hash;
    }

    return Storage.MU;
}

async function create_bus( MUS ) {
    console.log("MU Hash Table", MUS );
    
    for ( var unit of base_units ) {

	var mu_hash				= MUS.symbol[ unit.symbol ];
	var entry				= await add( 'add_base_unit', {
	    "mu_hash": mu_hash,
	    "entry": unit,
	});
	console.log(entry);
	Storage.BU.name[ unit.name ]		= entry.hash;
    }

    return Storage.BU;
}

async function create_ps( BUS ) {
    console.log("BU Hash Table", BUS );
    
    var entry					= await add( 'add_price_sheet', {
	"entry": {
	    "name": "Main price sheet"
	},
    });
    var ps_hash					= entry.hash;
    
    for ( var unit of price_sheet ) {

	var bu_hash				= BUS.name[ unit.name ];
	var entry				= await add( 'add_price_sheet_unit', {
	    "ps_hash": ps_hash,
	    "bu_hash": bu_hash,
	    "entry": unit,
	});
	console.log(entry);
	Storage.PSU.name[ unit.name ]		= entry.hash;
    }

    return Storage.PSU;
}

async function create_psf( PSU ) {
    console.log("PSU Hash Table", PSU );
    var BU					= Storage.BU;
    
    for ( var product of products ) {

	var entry				= await add( 'add_product_service', {
	    "entry": {
		"name": product.name
	    },
	});
	var psf_hash				= entry.hash;
	
	for ( var name in product.units ) {
	    var unit				= product.units[ name ];
	    var bu_hash				= BU.name[ name ];
	    
	    unit.name				= name;
	    var entry				= await add( 'add_product_service_unit', {
		"psf_hash": psf_hash,
		"bu_hash": bu_hash,
		"entry": unit,
	    });
	    console.log(entry);
	}
    }

    return;
}

create_mus()
    .then( create_bus )
    .then( create_ps )
    .then( create_psf );
