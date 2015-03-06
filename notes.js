if (Meteor.isClient) {

    var Notes = new Mongo.Collection("notes");

    Router.route('/', function () {
      this.render('create');
    });

    Router.route('/note/:_id', function(){
        var note = getNote(this.params._id);
        this.render("note", {data : note });
    });

    Router.route('/directions/:_id', function(){
        var note = getNote(this.params._id);
        this.render('directions', {data: { json: JSON.stringify(note)} });
    });

    Template.create.rendered = function () {
        startMap();
        $(document).ready(function(){
          $('.slider').slick({
            
          });
        });
    };

    Template.create.events({
        "click .show-form": function(){
            $('.slider').slickGoTo(1);
        },  
        "submit .new-note": function(event) {

            event.stopPropagation();
            event.preventDefault();
            // This function is called when the new task form is submitted

            var note = $(".note:first").val();

            var data = {
                type: "Feature",
                text: note,
                createdAt: new Date(), // current time
                geometry: {
                    coordinates: [Session.get("lat"), Session.get("long")],
                    type: "Point"
                },
                properties: {}
            };

            console.log("save", data);

            var created = Notes.insert(data);
            console.log('created', created);
            Session.set("createdNote", created);

            // Clear form
            $(".note:first").val("");

            $('.slider').slickGoTo(2);
            // Prevent default form submit
            return false;
        },
        "click .done": function(){
            $('.slider').slickGoTo(0);
        },  
    });

    // Counter as a substitue for lack of promises
    var counter = 0;
    function startMap(){
        counter ++;
        if(counter == 2) {

            // Initialize the map
            console.log("things", window.lat, window.long, Session.get("lat"), Session.get("long"));
            L.mapbox.accessToken = 'pk.eyJ1IjoiYm96emx0cm9uIiwiYSI6IlNhc0NrMkkifQ.HhxLApbxuUS5zBneABgMjg';
            var map = L.mapbox.map('map', 'bozzltron.lce0jbb7').setView([window.lat, window.long], 15);

            // Add a marker at the users position
            var marker = L.marker([window.lat, window.long], {draggable:true}).addTo(map);
            marker.on('dragend', function(event){
                Session.set("lat", event.target._latlng.lat);
                Session.set("long", event.target._latlng.lng);
            });

            // Move marker on click
            map.on('click', function(event){
                marker.setLatLng(event.latlng);
                Session.set("lat", event.latlng.lat);
                Session.set("long", event.latlng.lng);
            });

        }
    }

    function getNote(id){
        var note = Notes.findOne({_id: id});
        note.time = moment(note.createdAt).fromNow();
        note.distance = getDistance(
            Session.get("lat"), 
            Session.get("long"), 
            note.geometry.coordinates[0],
            note.geometry.coordinates[1]
            );
        note.direction = getDirection(
            Session.get("lat"), 
            Session.get("long"), 
            note.geometry.coordinates[0],
            note.geometry.coordinates[1]
            );
        note.display = note.distance < 10;     
        return note;
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1); // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d * 1000 // Distance in m
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180)
    }

    function getDirection(lat1, lon1, lat2, lon2) {
        console.log("angle args", arguments);
        var angleDeg = Math.atan2(lat2 - lat1, lon2 - lon1) * 180 / Math.PI;
        console.log("angle before", angleDeg);
        angleDeg = angleDeg < 0 ? angleDeg + 360 : angleDeg;
        console.log("angle", angleDeg);
        if( angleDeg > 345 || angleDeg <= 15 ) {
            return "East";
        }
        if( angleDeg > 15 && angleDeg <= 75 ) {
            return "North East";
        }
        if( angleDeg > 75 && angleDeg <= 115 ) {
            return "North";
        }
        if( angleDeg > 115 &&  angleDeg <= 175 ) {
            return "North West";
        }
        if( angleDeg > 175 && angleDeg <= 195 ) {
            return "West";
        }
        if( angleDeg > 195 &&  angleDeg < 255 ) {
            return "South West";
        }
        if( angleDeg > 255 &&  angleDeg < 285 ) {
            return "South";
        }
        if( angleDeg > 285 && angleDeg < 345 ) {
            return "South East";
        }
        return "";
    }

    function storeLocation(location) {
        Session.set("lat", location.coords.latitude);
        Session.set("long", location.coords.longitude);
        window.lat = location.coords.latitude;
        window.long = location.coords.longitude;
        startMap();
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(storeLocation);
    }

    Template.create.helpers({
        notes: function() {
            if (Session.get("lat") && Session.get("long")) {
                var result = Notes.find({
                    'geometry': {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [Session.get("lat"), Session.get("long")]
                            },
                            $maxDistance: 10000
                        }
                    }
                });
                return result;
            } else {
                return [];
            }
        },
        nextNote: function() {
            if (Session.get("lat") && Session.get("long")) {
                var result = Notes.findOne({
                    geometry: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [Session.get("lat"), Session.get("long")]
                            },
                            $minDistance: 10
                        }
                    }
                });
                return result;
            } else {
                return [];
            }
        },
        lat: function(){
            return Session.get("lat");
        },
        long: function() {
            return Session.get("long");
        },
        createdNote: function(){
            return Session.get("createdNote") ? Session.get("createdNote") : "";
        }
    });

}

if (Meteor.isServer) {

    Meteor.startup(function() {

        var Notes = new Mongo.Collection("notes");
        Notes._ensureIndex({
            'geometry.coordinates': '2dsphere'
        });

    });

}
