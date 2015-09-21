var data = {
    mapMarkers: [],
    placeTypes: [
        {
            name: "All",
            value: "all"
        },
        {
            name: "Accounting",
            value: "accounting"
        },
        {
            name: "Airport",
            value: "airport"
        },
        {
            name: "Amusement Park",
            value: "amusement_park"
        },
        {
            name: "Aquarium",
            value: "aquarium"
        },
        {
            name: "Art Gallery",
            value: "art_gallery"
        },
        {
            name: "Restaurant",
            value: "restaurant"
        },
        {
            name: "Lodging",
            value: "lodging"
        },
        {
            name: "Food",
            value: "food"
        },
        {
            name: "Point of Interest",
            value: "point_of_interest"
        },
        {
            name: "Cafe",
            value: "cafe"
        }
    ],
    selectedType: "all",
    selectedMarker: {},
};

var mapView = {
    mapCenter: function() {
        var center = mapView.getDeviceLocation() || {lat: 40.1583, lng: -83.0742};
        console.log(center);
        },
    gMap: new google.maps.Map(document.getElementById('map'), {
        //TODO: accept user-defined center location
        center: {lat: 40.1583, lng: -83.0742},  //Powell, OH
        //center: {lat: 37.441883, lng: -122.143019},  //Palo Alto, CA
        zoom: 13
        }),
    infowindow: new google.maps.InfoWindow({maxWidth: 300}),
    getDeviceLocation: function() {
        //Try setCenter based on user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                mapView.infowindow.setPosition(pos);
                mapView.infowindow.setContent('You are somewhere near here.');
                mapView.gMap.setCenter(pos);
                mapView.infowindow.open(mapView.gMap);
            }, function() {
                //Geolocation service failed
                handleLocationError(true, mapView.infowindow, mapView.gMap.getCenter());
            });
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, mapView.infowindow, mapView.gMap.getCenter());
        };
        //Current Position error handler
        function handleLocationError(browserHasGeolocation, infoWindow, pos) {
            infoWindow.setPosition(pos);
            infoWindow.setContent(browserHasGeolocation ?
                "Error: The Geolocation service failed." :
                "Error: Your browser doesn't support geolocation.");
            mapView.infowindow.open(mapView.gMap);
        }
    },
    openInfowindow: function(place) {
        var place = place;
        var name = '<strong>' + place.name + '</strong>';
        var address = '<p>' + place.vicinity + '</p>';
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' +
        encodeURIComponent(place.name) + '&format=json&callback=wikiCallback';
        var content = "";
        $.ajax(wikiUrl, {
            dataType: 'jsonp',
            //Set content if successful
            success: function( response ) {
                var articleList = response[1];
                for (var i = 0; i < 1; i++) {
                    var articleStr = articleList[i];
                    if (articleStr) {
                        var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                        contentLink = '<p><a href="' + url + '" target="_blank">' + articleStr +
                        '<span class="glyphicon glyphicon-new-window" aria-hidden="true"></span></a></p>';
                        mapView.infowindow.setContent(name + address + contentLink);
                    } else {
                        mapView.infowindow.setContent(name + address + '<p>(wiki article unavailable)</p>');
                    }
                }
            },
            //Set content if fail
            error: function() {
                console.log("wiki error")
                mapView.infowindow.setContent(name + address + '<p>(wiki article unavailable)</p>');
            }
        });
        mapView.infowindow.open(mapView.gMap, place);
        //Animate marker for 2 secs
        place.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout( function(){place.setAnimation(null)}, 2000);
    },
    clearMapMarkers: function() {
        markers = koViewModel.mapMarkers();
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        koViewModel.mapMarkers([]);
    },
    createMarker: function(place) {
        //TODO:  Add icons for different place-types
        console.log("createMarker place:");
        console.log(place);
        var placeLoc = place.geometry.location;

        //create marker
        var marker = new google.maps.Marker({
            map: this.gMap,
            position: placeLoc,
            placeId: place.place_id,
            animation: google.maps.Animation.DROP,
            name: place.name,
            vicinity: place.vicinity,
            types: place.types,
            title: place.name
        });
        //setMap according to selectedType
        var selectedType = koViewModel.selectedType();
        if (selectedType != "all" && marker.types.indexOf(selectedType) == -1 ) {
            marker.setMap(null)
        }

        //add marker to koViewModel.mapMarkers
        koViewModel.mapMarkers.push(marker);

        //add click listener to marker
        google.maps.event.addListener(marker, 'click', function() {
            mapView.openInfowindow(marker);
        });
        return marker;
    },
    initSearchPlaces: function() {
        var input = document.getElementById('search-input');
        var searchBox = new google.maps.places.SearchBox(input);
        //Reset map bounds if necessary
        mapView.gMap.addListener('bounds_changed', function() {
            searchBox.setBounds(mapView.gMap.getBounds());
        });
        mapView.getDeviceLocation();

        //Filter place-types from view-list and markers as they are unchecked
        $("select[name='select-place']").change(function() {
            var markerID = this.value;
            var markers = koViewModel.mapMarkers();
            for (var i = 0; i < markers.length; i++) {
                if (markers[i].placeId === markerID) {
                    mapView.openInfowindow(markers[i]);
                }
            }
        });
        //setMap on markers according to selected type
        $("select[name='select-type']").change(function() {
            var selectedType = this.value;
            var markers = koViewModel.mapMarkers();
            for (var i = 0; i < markers.length; i++) {
                if(selectedType == "all") {
                    markers[i].setMap(mapView.gMap)
                }else if(markers[i].types.indexOf(selectedType) == -1 ) {
                    markers[i].setMap(null)
                }else{
                    markers[i].setMap(mapView.gMap)
                }
            }
        });
        //Process new search
        searchBox.addListener('places_changed', function() {
            var places = searchBox.getPlaces();
            console.log("places");
            console.log(places);
            if (places.length == 0) {
                //TODO:  handle this case better
                return;
                console.log("running 'no places'");
            }else{
                //clear existing markers
                console.log("running else");
                mapView.clearMapMarkers();

                var bounds = new google.maps.LatLngBounds();
                for (var i = 0; i < places.length; i++) {
                    mapView.createMarker(places[i]);
                    //Set bounds to contain the new place
                    if (places[i].geometry.viewport) {
                        // Only geocodes have viewport.
                        bounds.union(places[i].geometry.viewport);
                    } else {
                        bounds.extend(places[i].geometry.location);
                    }
                }
                //Set map bounds to contain all places (this code might be redundant)
                mapView.gMap.fitBounds(bounds);
            }
            //Clear search box
            input.value = "";
        })
    },
    initNearbyMarkers: function() {
        var latLng = mapView.gMap.getCenter();

        var loc = {
            lat: latLng.lat(),
            lng: latLng.lng()
        };

        var request = {
            location: loc,
            radius: '5000',
            types: ['restaurant', 'lodging', 'cafe']
        };

        service = new google.maps.places.PlacesService(mapView.gMap);
        service.nearbySearch(request, function(results, status) {
            console.log(results);
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                console.log("status OK");
                for (var i = 0; i < results.length; i++) {
                    var place = results[i];
                    mapView.createMarker(results[i]);
                }
            }else{
                console.log("status NOT OK");
            }
        });
    },
};

var koViewModel = {
    visibility: function(markerTypes){
        var isVisible = true;
        var selectedType = this.selectedType();
        if(selectedType != "all" && markerTypes.indexOf(selectedType) == -1) {
            isVisible = false;
        }
        return isVisible;
    },
    mapMarkers: ko.observableArray(data.mapMarkers),
    placeTypes: ko.observableArray(data.placeTypes),
    options: ko.observable("filter"),
    selectedType: ko.observable(data.selectedType),
    selectedMarker: ko.observable(data.selectedMarker),
    initializers: [
        mapView.initSearchPlaces(),
        mapView.initNearbyMarkers()
        ]
};

ko.applyBindings(koViewModel);