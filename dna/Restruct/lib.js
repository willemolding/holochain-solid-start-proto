function genesis () {
    return true;
}

var isolate		= {
    method: function(name, fn, err) {
	if (['eval', 'arguments'].indexOf(name) !== -1)
	    throw new Error(name+" is a reserved function name");
	
	var def = [
	    "global[name]	= function "+name+"() {",
	    "    try {",
	    "        return fn.apply(eval.data, arguments);",
	    "    } catch(e) {",
	    "        return err(e);",
	    "    }",
	    "}; global[name][name] = fn;",
	].join("\n");
	
	eval(def);
    },
    inspect: function(name) {
	return global[name][name].toString();
    },
    error: function(fn) {
	eval.error = fn;
    },
    eval: function() {
	// eval(code, context, function context)
	// reserved words: eval, arguments
	try {
	    eval.data	= arguments[2] || arguments[1];
	    return (function () {
		return eval(arguments[0]);
	    }).call(arguments[1], arguments[0]);
	}
	catch (e) {
	    if (typeof eval.error === 'function')
		eval.error(e);
	    return null;
	}
    },
    extract: function() {
	// eval(code, <object> context)
	try {
	    eval.data	= arguments[1];
	    if (typeof arguments[1] !== 'object')
		throw TypeError("Argument 2 must be an object");
	    return (function () {
		console.log([
		    'function ('+Object.keys(this).join(', ') + ') {',
    		    '    '+ ( arguments[0].startsWith('=') ? 'return '+arguments[0].slice(1) : arguments[0] ),
		    '})(' + Object.keys(this).map(function(k) { return 'this.'+k; }).join(', ') +')'
		].join("\n"));
		
		return eval([
		    '(function ('+Object.keys(this).join(', ') + ') {',
    		    '    '+arguments[0].startsWith('=') ? 'return '+arguments[0].slice(1) : arguments[0],
		    '})(' + Object.keys(this).map(function(k) { return 'this.'+k; }).join(', ') +')'
		].join("\n"));
	    }).call(arguments[1], arguments[0].trim());
	}
	catch (e) {
	    if (typeof eval.error === 'function')
		eval.error(e);
	    return null;
	}
    },
};

function startsWith(s, n) {
    return s.indexOf(n) === 0;
}


function Template(str) {
    if (!(this instanceof Template))
	return new Template(str);
    
    if (typeof str !== 'string') {
	throw new Error(
	    Populater({ type:typeof str, ctx:JSON.stringify(str, null, 4) })(
		"Template only takes 1 string, not type '{{type}}' {{ctx}}"
	    )
	);
    }

    this.str		= str;
    Populater.before	= str;
}    
Template.prototype.fill	= function(s) {
    var v;
    var str		= s.slice();
    
    var regex		= /{{([^}]+)}}/gi;
    var match		= regex.exec(s);
    while (match !== null) {
	if (match[1].indexOf('.') !== -1 || match[1].indexOf('[') !== -1)
	    v		= isolate.eval("this."+match[1].trim(), this.ctx, this.fn_ctx);
	else
	    // Accommodate indexing with numbers
	    v		= isolate.eval("this['"+match[1].trim()+"']", this.ctx, this.fn_ctx);
	if (v === undefined)
	    v		= '';
	str		= str.replace(match[0], v);
	var match	= regex.exec(s);
    }
    
    return str;
};
Template.prototype.eval	= function(str) {
    return isolate.eval(str, this.ctx, this.fn_ctx);
};
Template.prototype.context	= function(ctx, fn_ctx) {
    this.ctx		= ctx;
    this.fn_ctx		= fn_ctx;
    
    var v;
    if (startsWith(this.str, '<'))
	v		= this.eval("this."+this.str.slice(1));
    else {
	v		= this.fill(this.str);
	if (startsWith(this.str, ':'))
	    v		= v.slice(1);
	else if (startsWith(this.str, '='))
	    v		= this.eval(v.slice(1));
    }

    Populater.after	= v; // temporary: need by tests for logging
    return v;
    
};


function Populater(data, ctx) {
    
    if (typeof data !== 'object') {
	throw new Error(
	    Populater({ type: typeof data })(
		"Populater can only take complex objects, not type '{{type}}'.  See Populater.template() for other uses."
	    )
	);
    }

    return function(str) {
	return Template(str).context(data, ctx);
    }
}


Populater.template		= function(str) {
    return Template(str);
}
Populater.error		= function(fn) {
    return isolate.error(fn);
}
Populater.method	= function(name, fn, err) {
    return isolate.method(name, fn, err);
}

var populater			= Populater;

if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
	value: function assign(target, varArgs) { // .length of function is 2
	    'use strict';
	    if (target == null) { // TypeError if undefined or null
		throw new TypeError('Cannot convert undefined or null to object');
	    }

	    var to = Object(target);

	    for (var index = 1; index < arguments.length; index++) {
		var nextSource = arguments[index];

		if (nextSource != null) { // Skip over if undefined or null
		    for (var nextKey in nextSource) {
			// Avoid bugs when hasOwnProperty is shadowed
			if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
			    to[nextKey] = nextSource[nextKey];
			}
		    }
		}
	    }
	    return to;
	},
	writable: true,
	configurable: true
    });
}

var extend			= Object.assign;

function Structure(struct) {
    return function(data) {
	return Restruct(data, struct);
    };
}

function Collection(data) {
    if (!(this instanceof Collection))
	return new Collection(data);

    this.data		= data;
}
Collection.prototype.format	= function (struct) {
    return Restruct(this.data, struct);
}


function Frame(data, parent, key, result) {
    if (!(this instanceof Frame))
	return new Frame(data, parent, key, result);

    this.parent		= parent || null;
    this.key		= key || null;
    this.value		= data;
    this.result		= result || {};
    this.first		= false;
    this.last		= false;
    this.path		= '';

    var frame		= this;
    while (frame.parent) {
	this.path	= '/'+frame.key+this.path;
	frame		= frame.parent;
    };
    
    if (this.parent) {
	var keys	= this.parent.keys();
	this.first	= this.key === keys[0];
	this.last	= this.key === keys[keys.length-1];;
    }
}
Frame.prototype.is_root		= function() {
    return !this.parent;
}
Frame.prototype.source		= function(key) {
    if (!this.parent)
	return null;
    else
	return key ? this.parent.value[key] : this.parent.value;
};
Frame.prototype.keys		= function() {
    return Object.keys(this.value);
};
Frame.prototype.values		= function() {
    var $this	= this;
    return this.keys().map(function(k) {
	return $this.value[k];
    });
};
Frame.prototype.child		= function(k) {
    return Frame(this.value[k], this, k, this.result);
};
Frame.prototype.children	= function() {
    var $this	= this;
    return this.keys().map(function(k) {
	return $this.child(k);
    });
};
Frame.prototype.path		= function() {
};
Frame.prototype.root		= function() {
    var frame	= this;
    while (frame.parent) {
	frame = frame.parent;
    };
    return frame;
};


function Restruct(data, struct) {
    if (!(this instanceof Restruct))
	return new Restruct(data, struct);

    if (typeof struct !== 'object' || struct === null)
	throw Error("Bad Structure: structure is undefined");
    
    // Turn structure into predictable objects (no RegExp, undefined or function).  Limits the
    // complex objects to Array's and Dicts
    this.data		= data;
    this.struct		= JSON.parse(JSON.stringify(struct));
    this.root		= Frame(data);
    
    this.extend(this.root, this.struct, this.root.result);
    this.root.result	= this.flatten(this.root.result);
    
    return this.root.result;
}
Restruct.flattenTrigger	= '__array';
Restruct.rescopeTrigger	= '__rescope';
// Restruct.keyKey		= '$key';
// Restruct.indexKey	= '$index';
// Restruct.parentKey	= '$parent';
Restruct.lastDynamicKey;

Restruct.prototype.flatten	= function (result, flattened) {
    // Go through entire result and flatten dicts that contain this.flattenTrigger command.  If not
    // true just remove command.
    var flatten		= result[Restruct.flattenTrigger];
    delete result[Restruct.flattenTrigger];

    if (flattened === undefined)
	flattened	= [];

    flattened.push(result);
    for (var k in result) {
	var child	= result[k];
	if (typeof child === 'object' && child !== null && flattened.indexOf(child) === -1)
	    result[k]	= this.flatten(result[k], flattened);
    }
    
    if (flatten === true) {
	result = Object.keys(result).map(function (k) {
	    return result[k];
	});
    }
    
    return result;
}    
Restruct.prototype.extend = function (frame, struct, result) {
    var data		= frame.value;
    
    if (Array.isArray(data))
    	return this.extend_list(frame, struct, result);

    // data and Frame(data)
    var fill		= populater(data, frame);
    
    for (var key in struct) {
	if (key === Restruct.flattenTrigger) {
	    result[key]	= struct[key];
	    continue;
	}

	var v		= struct[key];
	// if (key === Restruct.rescopeTrigger) {
	//     if (Array.isArray(v)) {
	// 	var d	= fill(v[0]);
	// 	for (var i in d) {
	// 	    var blob	= d[i];
	// 	    d[i]	= extend({}, data);
	// 	    d[i][v[1]]	= blob;
	// 	}
	//     } else if (typeof v === 'string') {
	// 	var d	= fill(v);
	//     } else {
	// 	throw Error("Unsupported use of .rescope");
	//     }
	//     delete struct[key];
	//     return this.extend(d, struct, {});
	// }
	
	var spot	= result;
	var k		= fill(key);
	if (k === undefined || k === null)
	    continue;
	else if (Array.isArray(k)) {
	    for (var i=0; i < k.length-1; i++) {
		var tk	= k[i];
		if (result[tk] === undefined)
		    result[tk]	= {};
		result		= result[tk];
	    }
	    var k	= k[i];
	    Restruct.lastDynamicKey	= k;
	}
	
	// data[Restruct.keyKey]		= Restruct.lastDynamicKey;

	if (result[k] === undefined) {
	    if (v === true)
		result[k]	= data[k];
	    else if(typeof v === 'string')
		result[k]	= fill(v);
	    else if(Array.isArray(v)) {
		if (typeof v[0] === 'string')
		    result[k]	= [ fill(v[0]) ];
		else if (typeof v[0] === 'object' && v[0] !== null) {
		    result[k]	= [ this.extend(frame, v[0], {}) ];
		}
		else
		    result[k]	= [ v[0] ];
	    }
	    else if(v === false)
		delete result[k];
	    else
		// Recursively extend sub dictionaries
		result[k]	= this.extend(frame, v, {});
	} else {
	    // Key already exists in result.  If the struct is an
	    // Array at this point we append this data to it.  If it
	    // is a dictionary then we recursively call extend and
	    // narrow down the struct/result scopes.
	    
	    if (Array.isArray(struct[key])) {
		if (typeof v[0] === 'string')
		    result[k].push( fill( struct[key][0] ) );
		else if (typeof v[0] === 'object' && v[0] !== null)
		    result[k].push( this.extend(frame, v[0], {}) );
		else
		    result[k].push( v[0] );
	    }
	    else if (typeof struct[key] === 'object' && struct[key] !== null)
		this.extend(frame, struct[key], result[k]);
	}

	if (result[k] === undefined)
	    delete result[k];

	// If result was relocated by a dynamic key, spot will put it
	// back in the original location.
	result		= spot;
    }
    
    if (Array.isArray(struct)) {
	return Object.keys(result).map(function (k) {
	    return result[k];
	});
    }
    else
	return result;
}
Restruct.prototype.extend_list = function (frame, struct, result) {
    var rows		= frame.value;
    if (rows.length === 0) {
	// this.extend({}, struct, result);
    }
    else {
	for (var i in rows) {
	    // rows[i][Restruct.indexKey]	= parseInt(i);
	    // rows[i][Restruct.parentKey]	= rows;
	    
	    this.extend(frame.child(i), struct, result);
	}
    }
}

Restruct.method		= function(name, fn, err) {
    return populater.method(name, fn, err);
};
Restruct.populater	= populater;
Restruct.structure	= Structure;
Restruct.collection	= Collection;

function restruct( cmd ) {
    log("Restruct input:", json(cmd));
    try {
	return Restruct( cmd.data, cmd.struct );
    } catch (err) {
	log("Restruct caught error:", json(err));
    }
}

function json( d, f ) {
    return JSON.stringify( d, null, f === undefined ? 4 : f );
}
function log() {
    debug( Date() +' - /lib.js: '+ [].slice.call(arguments).join(' ') );
}
