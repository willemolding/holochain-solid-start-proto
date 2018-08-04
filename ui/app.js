
var templates			= {};
var $templates			= $('<div id="modal-templates">');

$('body').append( $templates );


function api( zome, fn, data, callback ) {
    var uri			= '/fn/' + zome + '/' + fn;
    
    $.ajax({
	"url": uri,
	"type": "POST",
	"data": typeof data === 'string' ? data : JSON.stringify( data ),
	"contentType": "application/json",
	success: function( resp ) {
	    console.log( resp );
	    try {
		resp		= JSON.parse(resp);
	    } catch (err) {
		console.error( err );
	    }
	    if ( typeof callback === 'function' )
		callback( resp );
	}
    });
}

var data			= {
    systems: ["Imperial", "Metric"],
    measurementUnits: [],
};

function fetchMeasurementUnits() {
    api('ProductsServices', 'getAll', {
	entryType: "MU",
    }, function(resp) {
	console.log("Measurement units", resp );
	data.measurementUnits		= resp;
    });
}
fetchMeasurementUnits();

var listStories			= new Vue({
    el: '#listStories',
    data: data,
    methods: {
	refresh: function( event ) {
	    fetchMeasurementUnits();
	},
	calculateROI: function( story ) {
	    try {
		if (story.value === -1 || story.effort === -1)
		    return "Infinity";
		return ( story.value / story.effort ).toFixed(2);
	    } catch (err) {
		return "?";
	    }
	},
	getTasks: function( storyHash, story ) {
	    data.activeStory	= story;
	    data.activeStoryHash= storyHash;
	    fetchTasks( storyHash );
	},
	total: function (attr) {
	    var total		= 0;
	    for (var i in this.stories) {
		var story	= this.stories[i];
		total 	       += story.Entry[attr];
	    }
	    return total;
	}
    }
});

var listTasks			= new Vue({
    el: '#listTasks',
    data: data,
    methods: {
	refresh: function( event ) {
	    fetchTasks( data.activeStoryHash );
	},
	total: function (attr) {
	    var total		= 0;
	    for (var i in this.tasks) {
		var task	= this.tasks[i];
		total 	       += task.Entry[attr];
	    }
	    return total;
	},
	createTask: function ( event ) {
	    var self		= this;
	    console.log( this );

	    var input		= {
		"storyHash": data.activeStoryHash,
		"summary": this.summary,
		"hours": parseInt(this.hours),
	    };

	    api('tasks', 'write', input, function(resp) {
		self.hash	= resp;
		fetchTasks( data.activeStoryHash )
		self.summary	= null;
		self.hours	= null;
		$('#createTaskStart').focus();
	    });
	}
    }
});

var initCreateStory		= new Vue({
    el: '#createStoryModal',
    methods: {
	createStoryModal: function( event) {
	    templates.createStory.modal({
		backdrop: 'static',
		keyboard: false
	    });
	}
    }
});

$.get( "/createStory.html", function( html ) {
    templates.createStory		= $( html );

    $templates.append( templates.createStory );
    console.log( templates.createStory );

    var createStory			= new Vue({
	el: '#createStory',
	data: {
	    fibValues: data.fibValues,
	    title: null,
	    as: null,
	    feature: null,
	    reason: null,
	    effort: '',
	    value: '',
	    roi: 0,
	    hash: null,
	},
	watch: {
            effort: function(val, oldVal) {
		this.calculateROI();
	    },
            value: function(val, oldVal) {
		this.calculateROI();
	    }
	},
	methods: {
	    calculateROI: function( event ) {
		console.log("Calculating ROI from", this.value, this.effort);
		try {
		    this.roi		= this.value / this.effort;
		} catch (err) {
		    this.roi		= "?";
		}
	    },
	    createStory: function ( event ) {
		var self		= this;
		console.log( this );

		var data = {
		    "title": this.title,
		    "as": this.as,
		    "feature": this.feature,
		    "reason": this.reason,
		    "value": this.value,
		    "effort": this.effort,
		};

		api('stories', 'write', data, function(resp) {
		    self.hash		= resp;
		    
		    self.title		= null;
		    self.as		= null;
		    self.feature	= null;
		    self.reason		= null;
		    self.value		= '';
		    self.effort		= '';

		    templates.createStory.modal('hide');

		    fetchMeasurementUnits();
		});
	    }
	}
    });

});

// Insert some test stories
// api('stories', 'write', {
//     title:	"",
//     as:		"",
//     feature:	"",
//     reason:	"",
// });
