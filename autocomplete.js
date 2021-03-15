let originAutocomplete;
let destinationAutocomplete;
let distanceMatrixService;
let directionsService;
let originLat = 0;
let originLng = 0;
let destinationLat = 0;
let destinationLng = 0;
let autoDuration = 0;
let cycleDuration = 0;

function initAutocompletes() {
	// Create the autocomplete object, restricting the search predictions to
	// addresses and build out a search restriction for the Region of Waterloo.
	const originSearchBounds = new google.maps.LatLngBounds(
		new google.maps.LatLng(43.4326, -80.6262),
		new google.maps.LatLng(43.5081, -80.5013));
  const destinationSearchBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(43.2660, -80.8689),
      new google.maps.LatLng(43.6886, -80.1871));
  const originInput = document.getElementById("origin-autocomplete");
  const destinationInput = document.getElementById("destination-autocomplete");
  const originOptions = {
    bounds: originSearchBounds,
		types: ["geocode", "establishment"],
	  fields: ["geometry"],
    strictBounds: true
  };
  const destinationOptions = {
    bounds: destinationSearchBounds,
		types: ["geocode", "establishment"],
	  fields: ["geometry"],
    strictBounds: true
  };
  originAutocomplete = new google.maps.places.Autocomplete(originInput, originOptions);
  destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput, destinationOptions);
  distanceMatrixService = new google.maps.DistanceMatrixService();
  directionsService = new google.maps.DirectionsService();
  originAutocomplete.addListener("place_changed", saveOriginGeometry);
  destinationAutocomplete.addListener("place_changed", saveDestinationGeometry);
}

function saveOriginGeometry() {
  // Get the place details from the origin autocomplete object.
  const place = originAutocomplete.getPlace();
  originLat = place.geometry.location.lat();
  originLng = place.geometry.location.lng();
}

function saveDestinationGeometry() {
  // Get the place details from the destination autocomplete object.
  const place = destinationAutocomplete.getPlace();
  destinationLat = place.geometry.location.lat();
  destinationLng = place.geometry.location.lng();
}

function setDriveTimeStatus(driveTimeFound) {
  let driveResult = document.getElementById("drive-result");
  if (driveTimeFound) {
    driveResult.className = "success";
    driveResult.textContent = "Found";
  } else {
    driveResult.className = "failure";
    driveResult.textContent = "Error finding drive time"
  }
}

function setCycleTimeStatus(cycleTimeFound) {
  let cycleResult = document.getElementById("cycle-result");
  if (cycleTimeFound) {
    cycleResult.className = "success";
    cycleResult.textContent = "Found";
  }
  else {
    cycleResult.className = "failure";
    cycleResult.textContent = "Error finding cycle time"
  }
}

function findTravelTimes() {
  let departureDay = document.getElementById("departure-day").value;
  let departureHour = document.getElementById("departure-hour").value;
  let departureMinute = document.getElementById("departure-minute").value;
  let departurePeriod = document.getElementById("departure-period").value;
  if (originLat == 0 || originLng == 0 || destinationLat == 0 || destinationLng == 0) {
    alert("Both the origin and destination need to be set to find travel times.");
  } else if (departureDay == "none" || departureHour == "none" || departureMinute == "none" || departurePeriod == "none") {
    alert("Choose a departure day and time when you would most likely take this trip.");
  } else {
    // Finds the travel times using the Google Distance Matrix API or Google Directions API
    let originLatLng = new google.maps.LatLng(originLat, originLng);
    let destinationLatLng = new google.maps.LatLng(destinationLat, destinationLng);
    // Set the correct day and build the Date object
    let currentTime = new Date();
    let currentDay = currentTime.getDay();
    let dayDiff = departureDay - currentDay;
    if (dayDiff < 1) {
      dayDiff = 7 + dayDiff;
    }
    let departureTime = new Date();
    departureTime.setDate(departureTime.getDate() + dayDiff);
    if (departureHour == 12) {
      if (departurePeriod == "AM") {
        departureTime.setHours(0);
      } else {
        departureTime.setHours(12);
      }
    } else if (departurePeriod == "AM") {
      departureTime.setHours(departureHour);
    } else {
      departureHour = Number(departureHour) + 12;
      departureTime.setHours(departureHour);
    }
    departureTime.setMinutes(departureMinute);
    departureTime.setSeconds(0);
    document.getElementById("GoogleRequest_departureDate").value = departureTime;
    // Driving (Distance Matrix)
    distanceMatrixService.getDistanceMatrix({
      origins: [originLatLng],
      destinations: [destinationLatLng],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }, (response, status) => {
    // Only one value is submitted for O or D, so no need to iterate
      if (status == "OK") {
        let originDestinationPair = response.rows[0].elements[0];
        let distanceMatrixStatus = originDestinationPair.status;
        document.getElementById("GoogleRequest_driveStatus").value = "Distance Matrix: " + distanceMatrixStatus;
        if (distanceMatrixStatus == "OK") {
          autoDuration = Math.round(originDestinationPair.duration.value / 60);
          document.getElementById("GoogleRequest_driveTime").value = autoDuration;
          setDriveTimeStatus(true);
        } else {
          alert("Travel times for driving not found, try entering the locations again or contact the survey administrators at jacob.terry@uwaterloo.ca.")
          setDriveTimeStatus(false);
        }
      } else {
        document.getElementById("GoogleRequest_driveStatus").value = "Request: " + status;
        document.getElementById("GoogleRequest_driveTime").value = "";
        setDriveTimeStatus(false);
      }
    })
    // Cycling (Distance Matrix)
    distanceMatrixService.getDistanceMatrix({
      origins: [originLatLng],
      destinations: [destinationLatLng],
      travelMode: google.maps.TravelMode.BICYCLING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }, (response, status) => {
    // Only one value is submitted for O or D, so no need to iterate
      if (status == "OK") {
        let originDestinationPair = response.rows[0].elements[0];
        let distanceMatrixStatus = originDestinationPair.status;
        document.getElementById("GoogleRequest_cycleStatus").value = "Distance Matrix: " + distanceMatrixStatus;
        if (distanceMatrixStatus == "OK") {
          cycleDuration = Math.round(originDestinationPair.duration.value / 60);
          document.getElementById("GoogleRequest_cycleTime").value = cycleDuration
          setCycleTimeStatus(true);
        } else {
          alert("Travel times for cycling not found, try entering the locations again or contact the survey administrators at jacob.terry@uwaterloo.ca.")
          setCycleTimeStatus(false);
        }
      } else {
        document.getElementById("GoogleRequest_cycleStatus").value = "Request: " + status;
        document.getElementById("GoogleRequest_cycleTime").value = "";
        setCycleTimeStatus(false);
      }
    })
    // Transit (Directions)
    directionsService.route({
      origin: originLatLng,
      destination: destinationLatLng,
      travelMode: google.maps.TravelMode.TRANSIT,
      transitOptions: {
        departureTime: departureTime,
        // Need to hard-provide modes to find *any* transit option, otherwise for short trips it may default to walking
        modes: ['BUS', 'TRAM']
      },
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false,
      provideRouteAlternatives: false
    }, (response, status) => {
      if (status == "OK") {
        document.getElementById("GoogleRequest_transitStatus").value = "Directions: " + status;
        let tripLegs = response.routes[0].legs[0];
        document.getElementById("GoogleRequest_transitTime").value = Math.round(tripLegs.duration.value/60);
        let walkTime = 0;
        let waitTime = 0;
        let inVehicleTime = 0;
        let transferTimeAverage = 0;
        let transfers = 0;
        let route = "";
        steps = tripLegs.steps;
        if (steps.length == 1 && steps[0].travel_mode == "WALKING") {
          // There's no transit trip, it's just telling the user to walk
          document.getElementById("GoogleRequest_transitStatus").value = "Directions: OK. Walking alternative presented.";
        } else if (steps.length == 0) {
          // For some reason, there are no transit components
          document.getElementById("GoogleRequest_transitStatus").value = "Directions: OK. No steps to transit alternative provided.";
        } else {
          // Add a temporary transfer time holder for calculating the amount of time spent waiting for buses in between steps
          let tempArrivalTime = 0;
          let transferStateIsActive = false;
          let firstTransit = true;
          // Iterate over all steps in the trip to find the time components
          for (count = 0; count < steps.length; count++) {
            step = steps[count];
            if (step.travel_mode == "WALKING") {
              if (count == 0 || count == (steps.length - 1)) {
                // This is the access or egress leg
                walkTime += Math.round(step.duration.value/60);
              } else {
                if (!transferStateIsActive) {
                  // Transfer state is NOT active, so we will start one
                  transfers += 1;
                  transferStateIsActive = true;
                }
              }
            } else if (step.travel_mode == "TRANSIT") {
              if (firstTransit) {
                // This is the first transit trip, which will give us the headway if it's available
                route = step.transit.line.short_name;
                if ("headway" in step.transit) {
                  waitTime = Math.round(step.transit.headway.value/60);
                  document.getElementById("GoogleRequest_transitStatus").value = "Directions: OK. Headway found.";                  
                } else {
                  document.getElementById("GoogleRequest_transitStatus").value = "Directions: OK. No headway found so wait time set to 0.";                  
                }
                firstTransit = false;
              }
              if (transferStateIsActive) {
                // A transfer is being measured, so end the transfer and calculate the length
                transferStateIsActive = false;
              }
              if (tempArrivalTime != 0) {
                let tempDepartureTime = step.transit.departure_time.value;
                let tempTransferTime = Math.round((tempDepartureTime - tempArrivalTime)/60000);
                transferTimeAverage += tempTransferTime;
              }
              inVehicleTime += Math.round(step.duration.value/60);
              tempArrivalTime = step.transit.arrival_time.value;
            }
          }
          document.getElementById("GoogleRequest_transitTimeWalk").value = walkTime;
          document.getElementById("GoogleRequest_transitTimeWait").value = waitTime;
          document.getElementById("GoogleRequest_transitTimeIVTT").value = inVehicleTime;
          if (transfers > 0) {
            document.getElementById("GoogleRequest_transitTimeTransferAvg").value = transferTimeAverage / transfers;
          } else {
            document.getElementById("GoogleRequest_transitTimeTransferAvg").value = transferTimeAverage;
          }
          document.getElementById("GoogleRequest_transitNumTransfers").value = transfers;
          document.getElementById("GoogleRequest_transitRoute").value = route;
        }
      } else {
        document.getElementById("GoogleRequest_transitStatus").value = "Directions: " + status;
        document.getElementById("GoogleRequest_transitTimeWalk").value = "";
        document.getElementById("GoogleRequest_transitTimeWait").value = "";
        document.getElementById("GoogleRequest_transitTimeIVTT").value = "";
        document.getElementById("GoogleRequest_transitTimeTransferAvg").value = "";
        document.getElementById("GoogleRequest_transitNumTransfers").value = "";
        document.getElementById("GoogleRequest_transitTime").value = "";
        document.getElementById("GoogleRequest_transitRoute").value = "";
      }
    })
  }
}