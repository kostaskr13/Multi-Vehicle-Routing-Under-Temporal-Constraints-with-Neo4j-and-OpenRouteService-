import * as config from './configApis/config.js';
import {showMessage ,secondsToHours ,convertTimeToSeconds,getIconClass,getSurfaceType,checkIfmyNodeNameIsUnique,getNearestHighway,customAlert,isMarkerEqual} from "./tools.js";
import * as mapConfig from "./mapConfig.js";
import {} from "./vehicleConf.js"


  // Function to create a Neo4j driver
  export var driver = neo4j.driver(
    config.neo4jUrl,
    neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword),

  );

  const apiKey =config.apiKey;

  let typeStartArray=[];
  let typeEndArray=[];

  let currentRoute=[]; // Store the reference to the current route
  let arrow=[];
  export const nodesConf = {
    endNodesAr :[],
    startNodesAr :[],
  };
  export let availableNodes = [];
  export const nodesMarkerConf = {
     nodeMarkers : [],

  };

  let specificLogOutput = '';     
  export const sharedData = {
    deleteStartEnd: 0,
  };



  const map = L.map("map", { zoomControl: false }).setView([35.338735, 25.144213], 13);

  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(map);

    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);



  // Function to create a node in Neo4j using the provided data
 export function createNodeInNeo4j(name, latitude, longitude, streetName, streetNumber, nodeColor, startTime, endTime) {
  let existName="";

    checkIfmyNodeNameIsUnique(name).then(count => {
      if (count > 0) {
        existName=name;
        showMessage("This stop "+existName+" exist",2);
      } else {
        if (name) {
    const session = driver.session({ database: config.neo4jDatabase });
    
    const iconClass = getIconClass(nodeColor);
  
    const query = `
      CREATE (n:Node {
        name: $name,
        latitude: $latitude,
        longitude: $longitude,
        streetName: $streetName,
        streetNumber: $streetNumber,
        nodeColor: $nodeColor,
        startTime: $startTime,
        endTime: $endTime,
        iconClass: $iconClass
      })
    `;
  
    const parameters = {
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      streetName: streetName || null,
      streetNumber: streetNumber || null,
      nodeColor: nodeColor || null,
      startTime: startTime || null,
      endTime: endTime || null,
      iconClass: iconClass || null
    };
  
    session
    
      .run(query, parameters)
      .then(result => {
        resetNodes();
        loadNodesFromNeo4j();
        console.log("Node created in Neo4j:", result.summary.counters.nodesCreated);
      })
      .catch(error => {
        console.error("Error creating node in Neo4j:", error);
      })
      .finally(() => {
        session.close();
      });
    }else{
        console.log("already");
  
      }
    
    }
      
  })
}
  



// Function to fetch nodes from Neo4j and load them as markers
export function loadNodesFromNeo4j() {
  // Clear existing node markers from the map
  nodesMarkerConf.nodeMarkers.forEach(marker => marker.remove());
  nodesMarkerConf.nodeMarkers.length = 0;

  // Fetch nodes from Neo4j
  var session = driver.session({ database: config.neo4jDatabase });

  const fetchNodesQuery = `
    MATCH (n:Node)
    RETURN n.streetName AS streetName, n.latitude AS latitude, n.longitude AS longitude, n.streetNumber AS streetNumber, n.name AS name ,  n.nodeColor AS nodeColor ,n.startTime AS startTime,n.endTime AS endTime,n.vehicleName AS  vehicleName ,  n.arrivalTime AS arrivalTime
  `;

  session
    .run(fetchNodesQuery)
    .then(result => {
      // Process the result and create markers for each node
      result.records.forEach(record => {
        const streetName = record.get("streetName");
        const latitude = record.get("latitude");
        const longitude = record.get("longitude");
        const streetNumber = record.get("streetNumber");
        const name = record.get("name");
        const nodeColor = record.get("nodeColor");
        const startTime = record.get("startTime");
        const endTime = record.get("endTime");
        const arrivalTime= record.get("arrivalTime");
        const vehicleName= record.get("vehicleName");


        const nodes = result.records.map(record => ({
          streetName: record.get("streetName"),
          latitude: record.get("latitude"),
          longitude: record.get("longitude"),
          streetNumber: record.get("streetNumber"),
          name: record.get("name"),
          nodeColor: record.get("nodeColor"),
          startTime: record.get("startTime"),
          endTime: record.get("endTime"),
          arrivalTime: record.get("arrivalTime"),
          vehicleName: record.get("vehicleName"),
        }));
        // Check if the latitude and longitude are valid numbers
        if (!isNaN(latitude) && !isNaN(longitude)) {
          let icon;

          if (nodeColor === null) {
            icon = mapConfig.redIcon; 
          } else if (nodeColor === "yellow" ) {
            icon = mapConfig.yellowIcon; 
          } else if ( nodeColor === "green" ) {
            icon = mapConfig.greenIcon; 
          }else if ( nodeColor === "orange") {
            icon = mapConfig.orangeIcon; 
          }else {
            // Default icon for any other case
            icon = mapConfig.redIcon;
          }
          const formatValue = value => (value !== null && value !==""&& value !=="null" ? value : "-");
          const marker = L.marker([latitude, longitude], {
            icon: icon,
            name: name,
            streetName: streetName,
            streetNumber: streetNumber,
            nodeColor: nodeColor,
            startTime: startTime,
            endTime: endTime,
            arrivalTime: arrivalTime, 
            vehicleName:vehicleName,
          })
          .addTo(map)
          .bindPopup(name)
          .bindTooltip(
            `<strong>Stop Name:</strong> ${formatValue(name)}<br>` +
            `<strong>Street Name:</strong> ${formatValue(streetName)}<br>` +
            `<strong>Street Number:</strong> ${formatValue(streetNumber)}<br>` +
            `<strong>Stop Color:</strong> ${formatValue(nodeColor)}<br>` +
            `<strong>Start Time:</strong> ${formatValue(startTime)}<br>` +
            `<strong>End Time:</strong> ${formatValue(endTime)}<br>` +
            `<strong>vehicle Name:</strong> ${formatValue(vehicleName)}<br>`+
            `<strong>Arrival Time:</strong> ${formatValue(arrivalTime)}<br>`
          );

          if (!nodesMarkerConf.nodeMarkers.some(existingMarker => isMarkerEqual(existingMarker, marker))) {
            nodesMarkerConf.nodeMarkers.push(marker);
          }
        }
        availableNodes = nodes;

      });

    })
    .catch(error => {
      console.error("Error fetching nodes from Neo4j:", error);
    })
    .then(() => {
      session.close();
    });
}



export function updateMarkersOnMap() {
  
  // Clear the map of existing markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Add the remaining markers from the nodeMarkers array
  nodesMarkerConf.nodeMarkers.forEach(marker => {
    marker.addTo(map);
  });

}




// You can also close the modal when clicking outside the modal content
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
}


const modal = document.getElementById("customModal");
export let nearestHighway;

// ...
map.on("click", function (e) {
  if (map.getZoom() >= 12) {
    const { lat, lng } = e.latlng;

    getSurfaceType(lat, lng)
    .then(data => {
      console.log("API Response:", data); // Log the response data

      if (data) {

        getNearestHighway(lat, lng)
        .then((nearestHighway) => {
          // Update the nearestHighwaySpan content
          nearestHighwaySpan.textContent = `at "${nearestHighway}"`;
        })
        .catch((error) => {
          console.error("Error fetching nearest highway:", error);
        });


       // updateNearestHighwaySpan(nearestHighway1);
          // Get detailed address information including road number
          const nominatimURL = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;


           // Show the modal
           modal.style.display = "block";
 
           // Get the modal input fields
           const nameInput = document.getElementById("name");
           const colorInput = document.getElementById("color");
           const startTimeInput = document.getElementById("startTime");
           const endTimeInput = document.getElementById("endTime");
 
           // Handle the "Create Node" button click
           const createNodeButton = document.getElementById("createNodeButton");

           createNodeButton.onclick = function () {
             const name = nameInput.value.trim();
             const nodeColor = colorInput.value.trim();
             const startTime = startTimeInput.value.trim();
             const endTime = endTimeInput.value.trim();
 
             if (!name ) {
              customAlert("Please fill the stop name.");
               return;
             }else if((startTime && !endTime)){
              customAlert("Please fill the endTime or delete the startTime.");
               return;
             }else if((endTime && !startTime)){
              customAlert("Please fill the startTime or delete the endTime.");
               return;
             }else if(convertTimeToSeconds(startTime) > convertTimeToSeconds(endTime)){
              customAlert("The startTime must be earlier than endTime.");
              return;
             }

             // Close the modal
            closeModal(modal);


          fetch(nominatimURL)
            .then(response => response.json())
            .then(data => {
              if (data && data.address) {
                 nearestHighway = data.address.road;
                const roadNumber = data.address.house_number || "";

                
                let icon;

                if (nodeColor === null) {
                  icon = mapConfig.redIcon; 
                } else if (nodeColor === "yellow" ) {
                  icon = mapConfig.yellowIcon; 
                } else if ( nodeColor === "green" ) {
                  icon = mapConfig.greenIcon; 
                } else if ( nodeColor === "orange") {
                  icon = mapConfig.orangeIcon; 
                } else {
                  icon = mapConfig.redIcon;
                }
                
                checkIfmyNodeNameIsUnique(name).then(count => {
                  if (count > 0) {
                    customAlert("This name is already taken. Please enter a different name.",2);
                  } else {
                    // Proceed with node creation here
                    var session = driver.session({ database: config.neo4jDatabase });
                    if (name) {

                    const storeNodeQuery = `
                      MERGE (n:Node {streetName: $streetName, latitude: $latitude, longitude: $longitude, streetNumber: $streetNumber, name: $nodeName ,nodeColor: $nodeColor ,startTime: $startTime , endTime: $endTime})
                    `;

                    session
                      .run(storeNodeQuery, {streetName: nearestHighway, latitude: lat, longitude: lng, streetNumber: roadNumber, nodeName: name, nodeColor: nodeColor, startTime: startTime, endTime: endTime })
                      .then(() => {
                        loadNodesFromNeo4j();
                        console.log("Node created in Neo4j with streetName:", nearestHighway, "latitude:", lat, "longitude:", lng, "streetNumber:", roadNumber, "name:", name, "nodeColor:", nodeColor, "startTime:", startTime, "endTime:", endTime);
                        L.marker([lat, lng], { icon: icon })
                          .addTo(map)
                          .bindPopup(`street streetName: ${nearestHighway}<br>Road Number: ${roadNumber}<br>name: ${name}<br>nodeColor: ${nodeColor}<br>startTime: ${startTime}<br>endTime: ${endTime}<br><button onclick="removeMarker(this)">Cancel</button>`);
                      })
                      .catch((error) => {
                        console.error("Error creating node:", error);
                      })
                      .then(() => {
                        session.close();
                      });
                  }else{
                    customAlert("You have to give a name at the stop");
                  }
                }
                })
                .catch(error => {
                  console.error("Error:", error);
                });

              } else {
                customAlert("No address information found at this location. Node creation is not allowed.");
              }
            })
            .catch((error) => {
              console.error("Error fetching address data:", error);
            });
          }
            const closeButton = document.getElementsByClassName("close")[0];
            closeButton.onclick = function () {
              // Reset the input fields
              nameInput.value = "";
              colorInput.value = "";
              startTimeInput.value = "";
              endTimeInput.value = "";
  
              // Close the modal
              closeModal(modal);
            };
  
            // Function to close the modal
            function closeModal(modal) {
              modal.style.display = "none";
            }
      
        } else {
          customAlert("Stop creation is only allowed on roads.");
        }
      
      })
      .catch(error => {
        console.error("Error fetching surface type:", error);
      });
  } else {
    customAlert("Please zoom in to a higher level to create a node.");
  }
});




export function routingOpenService(vehicleConfigurations) {

  var session = driver.session({ database: config.neo4jDatabase });
  const visitedNodes = []; // Declare an array to store visited nodes
  typeStartArray = [];
  typeEndArray = [];
  const busStops = nodesMarkerConf.nodeMarkers
    .map((marker, index) => ({
      id: index + 2, 
      latitude: marker.getLatLng().lat,
      longitude: marker.getLatLng().lng,
      name: marker.options.name,
      startTime: marker.options.startTime, 
      endTime: marker.options.endTime,     
    }));



 const vehicles = vehicleConfigurations.map((config) => {

  const vehicle = {
    id: config.id, // Store the original vehicle ID from your configuration
    profile: 'driving-car',
    capacity: [config.capacity], // Use capacity from the user-provided configuration
  };

  // Check if a time_window property exists in the user-provided configuration
  if (config.hasOwnProperty('time_window')) {
    vehicle.time_window = config.time_window; // Use time window from the user-provided configuration
  }

  // Check if start and end nodes exist in the user-provided configuration
  if (config.hasOwnProperty('start_node') && config.hasOwnProperty('end_node')) {
    // Both start and end nodes exist
    vehicle.start = [
      availableNodes.find(node => node.name === config.start_node).longitude,
      availableNodes.find(node => node.name === config.start_node).latitude,
    ];
    vehicle.end = [
      availableNodes.find(node => node.name === config.end_node).longitude,
      availableNodes.find(node => node.name === config.end_node).latitude,
    ];
  } else if (config.hasOwnProperty('start_node')) {
    // Only the start node exists
    vehicle.start = [
      availableNodes.find(node => node.name === config.start_node).longitude,
      availableNodes.find(node => node.name === config.start_node).latitude,
    ];
  } else if (config.hasOwnProperty('end_node')) {
    // Only the end node exists
    vehicle.end = [
      availableNodes.find(node => node.name === config.end_node).longitude,
      availableNodes.find(node => node.name === config.end_node).latitude,
    ];
  }

  return vehicle;
});

  // Construct the jobs array based on your nodes
  const jobs = busStops.map((node, index) => {
    const job = {
      id: index + 2, // Start job ids from 2 to avoid conflicts with vehicle id (1),
      service: 300,
      amount: [1],
      location: [node.longitude, node.latitude],
    };

    // Check if the node has valid startTime and endTime in "HH:mm" format
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(node.startTime) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(node.endTime)) {
      job.time_windows = [
        [convertTimeToSeconds(node.startTime), convertTimeToSeconds(node.endTime)],
      ];
    } else {
    
    }

    return job;
  });
  // Create the request body without specifying jobs for vehicles
  const requestBody = {
    jobs,
    vehicles,
  };

  // Convert the request body to a JSON string
  const requestBodyJSON = JSON.stringify(requestBody);

  // Create an XMLHttpRequest
  const request = new XMLHttpRequest();

  request.open('POST', 'https://api.openrouteservice.org/optimization');
  request.setRequestHeader('Accept', 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8');
  request.setRequestHeader('Content-Type', 'application/json');
  request.setRequestHeader('Authorization', apiKey);

  request.onreadystatechange = function () {
    if (this.readyState === 4) {
      console.log('Status:', this.status);
      console.log('Headers:', this.getAllResponseHeaders());
      console.log('Body:', this.responseText);

      if (this.status === 200) {
        // Parse the response JSON
        const response = JSON.parse(this.responseText);

        // Check if a solution was found
        if (response.code === 0) {
          // Extract the optimized routes for all vehicles
          const optimizedRoutes = response.routes;

           // Reset the specific log output to an empty string before appending new log entries
          specificLogOutput = '';

          optimizedRoutes.forEach((route, index) => {


            const vehicleId =route.vehicle; 
            const vehicleName = `Vehicle ${vehicleId}`;
            const routeCoordinates = [];
            let arrivalTimeInMinutes ;
           
 
            const typeStart = route.steps
            .filter(step => step.type === "start")
            .map(step => {
              const loc = step.location;

              const typeStartNode = busStops.find(node => {
                const nodeLat16 = String(node.latitude).substring(0, 16);
                const nodeLon16 = String(node.longitude).substring(0, 16);
                const locLat16 = String(loc[1]).substring(0, 16);
                const locLon16 = String(loc[0]).substring(0, 16);
                return nodeLat16 === locLat16 && nodeLon16 === locLon16;
              });


              const arrivalTime = secondsToHours(step.arrival);
              typeStartArray.push({
                node: typeStartNode,
                relativeArrivalTime: `${arrivalTime} `,
                vehicleName: vehicleName, // Add the vehicleName to the visitedNodes array
              });
              routeCoordinates.push([step.location[1], step.location[0]]);

              return {
                name: typeStartNode ? typeStartNode.name : 'Unknown Start Node',
                arrivalTime: arrivalTime,
              };
            });


            // Extract the order in which jobs are visited along with arrival times relative to the start
            const jobOrderWithRelativeArrivalTimes = route.steps

              .filter(step => step.type === "job")
              .map(step => {
                arrivalTimeInMinutes=0 ;
                const nodeId = step.id;
                const visitedNode = busStops.find(node => node.id === nodeId);
                const arrivalTime = secondsToHours(step.arrival); // Extract the arrival time for the job step
                arrivalTimeInMinutes = arrivalTime;

                visitedNodes.push({
                  node: visitedNode,
                  relativeArrivalTime: `${arrivalTimeInMinutes} `,
                  vehicleName: vehicleName, // Add the vehicleName to the visitedNodes array

                });    
                      if (step.type === 'job') {
                        routeCoordinates.push([step.location[1], step.location[0]]);
                       }

                return {
                  name: visitedNode ? visitedNode.name : 'Unknown Node',
                  relativeArrivalTime: `${arrivalTimeInMinutes} `,
                };
              
              });


              const typeEnd = route.steps
              .filter(step =>  step.type === "end")
              .map(step => {
                const loc = step.location;
                const typeEndNode  = busStops.find(node => {
                  const nodeLat16 = String(node.latitude).substring(0, 16);
                  const nodeLon16 = String(node.longitude).substring(0, 16);
                  const locLat16 = String(loc[1]).substring(0, 16);
                  const locLon16 = String(loc[0]).substring(0, 16);
                  return nodeLat16 === locLat16 && nodeLon16 === locLon16;
                });
                const arrivalTime = secondsToHours(step.arrival);
                typeEndArray.push({
                  node: typeEndNode,
                  relativeArrivalTime: `${arrivalTime} `,
                  vehicleName: vehicleName, // Add the vehicleName to the visitedNodes array
                });
                routeCoordinates.push([step.location[1], step.location[0]]);


                return {
                  name: typeEndNode ? typeEndNode.name : 'Unknown End Node',
                  arrivalTime: arrivalTime,
                };
              });
              drawRoute(routeCoordinates, vehicleName);


            console.log(`Optimized Job Order for ${vehicleName} with Relative Arrival Times:`, jobOrderWithRelativeArrivalTimes);
           
            

            if(typeEnd.length!==0 && typeStart.length!==0){
              specificLogOutput += `Start stop for ${vehicleName}: ${JSON.stringify(typeStart)}\n\n`;
              specificLogOutput += `Optimized Job Order for ${vehicleName} with Relative Arrival Times: ${JSON.stringify(jobOrderWithRelativeArrivalTimes)}\n\n`;
              specificLogOutput += `End stop for ${vehicleName}: ${JSON.stringify(typeEnd)}\n\n`;
            }
            else if(typeStart.length!==0){
              specificLogOutput += `Start stop for ${vehicleName}: ${JSON.stringify(typeStart)}\n\n`;
              specificLogOutput += `Optimized Job Order for ${vehicleName} with Relative Arrival Times: ${JSON.stringify(jobOrderWithRelativeArrivalTimes)}\n\n`;

            }else if (typeEnd.length!==0){
              specificLogOutput += `Optimized Job Order for ${vehicleName} with Relative Arrival Times: ${JSON.stringify(jobOrderWithRelativeArrivalTimes)}\n\n`;
              specificLogOutput += `End stop for ${vehicleName}: ${JSON.stringify(typeEnd)}\n\n`;

            }
          });
          console.log(`visit nodes :`, visitedNodes);

          createRelationshipsBetweenNodes(visitedNodes,typeStartArray,typeEndArray);
          loadNodesFromNeo4j();
           
          
        } else {
          console.error('Optimization failed:', response.code);
        }
      } else {
        customAlert("Error setting up API key for Openservice route .Please check your configurations.");
        console.error('Request failed with status:', this.status);
      }
    }
  };

  for(let i=0; i<=currentRoute.length; i++){
    if (currentRoute[i] && arrow[i]) {

    map.removeLayer(currentRoute[i]);
    map.removeLayer(arrow[i]);
  }

  }
  
  // Send the request with the constructed body
  request.send(requestBodyJSON);

}






function createRelationshipsBetweenNodes(visitedNodes,typeStartArray,typeEndArray) {
  const session = driver.session({ database: config.neo4jDatabase });

  // Use a single transaction for all relationship creations and property updates
  const transaction = session.beginTransaction();

  // Add a query to delete all existing relationships between nodes
  const deleteAllRelationshipsQuery = `
    MATCH ()-[r]->()
    DELETE r
  `;

  // Execute the delete query first to remove existing relationships
  transaction
    .run(deleteAllRelationshipsQuery)
    .then(result => {
      console.log('Deleted all existing relationships');
    })
    .catch(error => {
      console.error('Error deleting existing relationships:', error);
    });

  // Sort visitedNodes based on relativeArrivalTime
  visitedNodes.sort((a, b) => a.relativeArrivalTime - b.relativeArrivalTime);

  if (visitedNodes.length > 0) {
    // Group visitedNodes by vehicle
    const groupedNodes = {};

    visitedNodes.forEach(node => {
      if (!groupedNodes[node.vehicleName]) {
        groupedNodes[node.vehicleName] = [];
      }
      groupedNodes[node.vehicleName].push(node);
    });

    // Process each group of nodes for each vehicle separately
    Object.keys(groupedNodes).forEach(vehicleName => {
      const nodesForVehicle = groupedNodes[vehicleName];


      nodesForVehicle.forEach((node, nodeIndex) => {
        console.log('Loop Iteration:', nodeIndex);
        console.log('visitedNodes.length - 1:', nodesForVehicle.length - 1);

        if (nodeIndex < nodesForVehicle.length - 1) {
          const fromNode = nodesForVehicle[nodeIndex];
          const toNode = nodesForVehicle[nodeIndex + 1];

          // Log some information to debug
          console.log(`Processing node index ${nodeIndex}`);
          console.log(`From Node: ${fromNode.node.name}`);
          console.log(`To Node: ${toNode.node.name}`);
          console.log(`Vehicle: ${fromNode.vehicleName}`); // Log the vehicleName

          // Execute a Cypher query to create a relationship between fromNode and toNode with the vehicleName property
          const createRelationshipQuery = `
            MATCH (a:Node {name: $fromNodeName}), (b:Node {name: $toNodeName})
            MERGE (a)-[:NEXT_STOP]->(b)
            SET a.vehicleName = $vehicleName, b.vehicleName = $vehicleName
          `;

          // Add a Cypher query to update the 'arrivalTime' property in the 'fromNode' with the relativeArrivalTime
          const updateArrivalTimeQuery = `
            MATCH (a:Node {name: $fromNodeName})
            SET a.arrivalTime = $relativeArrivalTime
          `;

         
            // Only update color for nodes 
            const updateColorQuery = `
              MATCH (a:Node {name: $fromNodeName})
              SET a.nodeColor = CASE WHEN $vehicleName = 'Vehicle 1' THEN 'yellow' WHEN $vehicleName = 'Vehicle 2' THEN 'green' WHEN $vehicleName = 'Vehicle 3' THEN 'orange' ELSE a.nodeColor END
            `;

            

            transaction
              .run(updateColorQuery, {
                fromNodeName: fromNode.node.name,
                vehicleName: fromNode.vehicleName, // Pass the vehicleName
              })
              .then(result => {
                console.log(`Updated color for ${fromNode.node.name} (Vehicle: ${fromNode.vehicleName})`);
              })
              .catch(error => {
                console.error('Error updating color:', error);
              });
          

          transaction
            .run(createRelationshipQuery, {
              fromNodeName: fromNode.node.name,
              toNodeName: toNode.node.name,
              vehicleName: fromNode.vehicleName, // Pass the vehicleName
            })
            .then(result => {
              console.log(`Created relationship between ${fromNode.node.name} and ${toNode.node.name} (Vehicle: ${fromNode.vehicleName})`);
            })
            .catch(error => {
              console.error('Error creating relationship:', error);
            });

          // Execute the query to update 'fromNode' with the calculated relativeArrivalTime
          transaction
            .run(updateArrivalTimeQuery, {
              fromNodeName: fromNode.node.name,
              relativeArrivalTime: fromNode.relativeArrivalTime,
            })
            .then(result => {
              console.log(`Updated arrival time for ${fromNode.node.name} to ${fromNode.relativeArrivalTime}`);
            })
            .catch(error => {
              console.error('Error updating arrival time:', error);
            });
        }
      });
     

      // Set the arrival time for the last visited node to its relativeArrivalTime
      const lastNode = nodesForVehicle[nodesForVehicle.length - 1];
      const setLastNodeArrivalTimeQuery = `
        MATCH (lastVisited:Node {name: $lastVisitedNodeName})
        SET lastVisited.arrivalTime = $relativeArrivalTime
      `;

    
        // Only update color for nodes 
        const updateColorQuery = `
          MATCH (lastVisited:Node {name: $lastVisitedNodeName})
          SET lastVisited.nodeColor = CASE WHEN $vehicleName = 'Vehicle 1' THEN 'yellow' WHEN $vehicleName = 'Vehicle 2' THEN 'green' WHEN $vehicleName = 'Vehicle 3' THEN 'orange' ELSE 'red' END
        `;

        transaction
          .run(updateColorQuery, {
            lastVisitedNodeName: lastNode.node.name,
            vehicleName: lastNode.vehicleName, // Pass the vehicleName
          })
          .then(result => {
            console.log(`Updated color for last visited node ${lastNode.node.name} (Vehicle: ${lastNode.vehicleName})`);
          })
          .catch(error => {
            console.error('Error updating color:', error);
          });
    

      transaction
        .run(setLastNodeArrivalTimeQuery, {
          lastVisitedNodeName: lastNode.node.name,
          relativeArrivalTime: lastNode.relativeArrivalTime,
        })
        .then(result => {
          console.log(`Set arrival time for last visited node ${lastNode.node.name} to ${lastNode.relativeArrivalTime}`);
        })
        .catch(error => {
          console.error('Error setting arrival time for last visited node:', error);
        });
            

        // Check if typeStartArray has a start node for the current vehicle
        const typeStartNodeForVehicle = typeStartArray.find(startNode => startNode.vehicleName === vehicleName);
        if (typeStartNodeForVehicle) {
          const createStartToVisitedQuery = `
            MATCH (a:Node {name: $startNodeName}), (b:Node {name: $visitedNodeName})
            MERGE (a)-[:START_TO_ROUTE]->(b)
          `;

          transaction
            .run(createStartToVisitedQuery, {
              startNodeName: typeStartNodeForVehicle.node.name,
              visitedNodeName: nodesForVehicle[0].node.name, // Use the first visited node as the visited node
            })
            .then(result => {
              console.log(`Created relationship between ${typeStartNodeForVehicle.node.name} and ${nodesForVehicle[0].node.name}`);
            })
            .catch(error => {
              console.error('Error creating relationship:', error);
            });
        }

        // Check if typeEndArray has an end node for the current vehicle
        const typeEndNodeForVehicle = typeEndArray.find(endNode => endNode.vehicleName === vehicleName);
        if (typeEndNodeForVehicle) {
          const createVisitedToEndQuery = `
            MATCH (a:Node {name: $visitedNodeName}), (b:Node {name: $endNodeName})
            MERGE (a)-[:ROUTE_TO_END]->(b)
          `;

          transaction
            .run(createVisitedToEndQuery, {
              visitedNodeName: nodesForVehicle[nodesForVehicle.length - 1].node.name, // Use the last visited node as the visited node
              endNodeName: typeEndNodeForVehicle.node.name,
            })
            .then(result => {
              console.log(`Created relationship between ${nodesForVehicle[nodesForVehicle.length - 1].node.name} and ${typeEndNodeForVehicle.node.name}`);
            })
            .catch(error => {
              console.error('Error creating relationship:', error);
            });
        }
        
        });
    

  // Call the function to update nodes
  updateNodes(visitedNodes);
  loadNodesFromNeo4j();
   
  
  } else {
    resetNodes();
    console.log('visitedNodes array is empty. No relationships created.');
  }

  // Commit the transaction and close the session
  transaction.commit()
    .then(() => {
      console.log('Transaction committed');
      session.close()
        .then(() => {
          console.log('Session closed');
          loadNodesFromNeo4j();
        })
        .catch(error => {
          console.error('Error closing session:', error);
        });
    })
    .catch(error => {
      console.error('Error committing transaction:', error);
      transaction.rollback()
        .then(() => {
          console.log('Transaction rolled back');
          session.close()
            .then(() => {
              console.log('Session closed');
            })
            .catch(error => {
              console.error('Error closing session:', error);
            });
        })
        .catch(rollbackError => {
          console.error('Error rolling back transaction:', rollbackError);
          session.close()
            .then(() => {
              console.log('Session closed');
            })
            .catch(error => {
              console.error('Error closing session:', error);
            });
        });
    });

  
}


function updateNodes(visitedNodes) {
  const session = driver.session({ database: config.neo4jDatabase });

  const allNodeNames = visitedNodes.map(node => node.node.name);
  const updateNonVisitedNodesColorQuery = `
    MATCH (a:Node)
    WHERE NOT a.name IN $visitedNodeNames
    SET a.nodeColor = 'red'
    REMOVE a.arrivalTime
    REMOVE a.vehicleName
    RETURN a.name AS notVisited
  `;
  session
    .run(updateNonVisitedNodesColorQuery, {
      visitedNodeNames: allNodeNames,
    })
    .then(result => {
      const notVisitedNodes = result.records.map(record => record.get("notVisited"));
      console.log('Nodes not Visited:', notVisitedNodes );
      specificLogOutput += `Not visited Stops : ${notVisitedNodes}\n\n`;

      // Show the specific log button
      const showSpecificLogButton = document.getElementById("showSpecificLogButton");
      showSpecificLogButton.style.display = "block";

      // Simulate a click event on the button
      showSpecificLogButton.click();
    }) 
    .catch(error => {
      console.error('Error updating nodes:', error);
    })
    .finally(() => {
      session.close()
        .then(() => {
          console.log('Session closed');
        })
        .catch(error => {
          console.error('Error closing session:', error);
        });
    });
    
}



export function resetNodes() {

  const session = driver.session({ database: config.neo4jDatabase });
  for(let i=0; i<=currentRoute.length; i++){
    if (currentRoute[i] && arrow[i]) {

    map.removeLayer(currentRoute[i]);
    map.removeLayer(arrow[i]);
  }
}
  // Define a query to delete all relationships from nodes
  const deleteAllRelationshipsQuery = `
  MATCH ()-[r]->()
  DELETE r
`;


  // Define a query to update node colors to red
  const updateNodeColorQuery = `
  MATCH (n:Node)
    SET n.nodeColor = 'red'
    REMOVE n.arrivalTime
    REMOVE n.vehicleName
  `;
  session
  .run(deleteAllRelationshipsQuery)
    .then(result => {
      console.log('Deleted all relationships from nodes');
      // Close the session after deleting relationships
      session.close()
        .then(() => {
          console.log('Session closed');
          // Create a new session for the next transaction
          const newSession = driver.session({ database: config.neo4jDatabase });
          // Run the second transaction to update node colors
          newSession
          .run(updateNodeColorQuery)
            .then(result => {
              console.log('Updated node colors to red');loadNodesFromNeo4j();
              // Close the new session
              newSession.close()
              .then(() => {
                  console.log('New session closed');
                })
                .catch(error => {
                  console.error('Error closing new session:', error);
                });
            })
            .catch(error => {
              console.error('Error updating node colors:', error);
            });
        })
        .catch(error => {
          console.error('Error closing session:', error);
        });
    })
    .catch(error => {
      customAlert("Error setting up Neo4j driver .Please check your configurations. ");
      console.error('Error deleting relationships:', error);
    });
    
  }


  function drawRoute(routeCoordinates, vehicleName) {
    
    const route = L.polyline([], { color: 'blue' }).addTo(map);
    const arrowDecorator = L.polylineDecorator(route, {
      patterns: [
        {
          offset: '100%',
          repeat: '50px',
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: {
              color: 'blue',
            },
          }),
        },
      ],
    }).addTo(map);
  
    let currentIndex = 0;
  
    function animateRoute() {
      if (currentIndex < routeCoordinates.length) {
        route.addLatLng(routeCoordinates[currentIndex]);
        arrowDecorator.setPaths([route.getLatLngs()]);
        currentIndex++;
        requestAnimationFrame(animateRoute);
      } else {
        // a tooltip with the vehicle name on hover
        route.on('mouseover', function () {
          this.bindPopup(`Route for ${vehicleName}`).openPopup();
        });
  
        // Remove the tooltip on mouseout
        route.on('mouseout', function () {
          this.closePopup();
        });
      }
    }
  
    animateRoute();
      // Update the current route reference
      currentRoute.push(route);
      arrow.push(arrowDecorator); 
  }


  
// This button will be used to display the specific log output
document.getElementById("showSpecificLogButton").addEventListener("click", function () {
  // Create a Blob with the specific log output
  const blob = new Blob([specificLogOutput], { type: 'text/plain' });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Open a small window to display the specific log output
  const specificLogWindow = window.open(url, '_blank', 'width=400,height=400,scrollbars=yes');
  specificLogWindow.focus();
});





// Event listener for the "Delete Node" button
document.getElementById("deleteNodeButton").addEventListener("click", () => {
  // Show the delete node modal
  const deleteNodeModal = document.getElementById("deleteNodeModal");
  deleteNodeModal.style.display = "block";

  // Get the select dropdown element
  const nodeNameSelect = document.getElementById("deleteNodeName");

  // Clear any existing options
  nodeNameSelect.innerHTML = "";

  // Add an empty option as the default
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Select a node to delete"; // You can customize this text
  nodeNameSelect.appendChild(emptyOption);

  // Populate the select dropdown with available nodes
  availableNodes.forEach((node) => {
    const option = document.createElement("option");
    option.value = node.name;
    option.textContent = node.name;
    nodeNameSelect.appendChild(option);
  });
});
  // Get a reference to the close button element
  const closeButton = document.getElementById("closeDeleteNodeModal");

  // Get a reference to the modal element
  const deleteNodeModal = document.getElementById("deleteNodeModal");

  // Add a click event listener to the close button
  closeButton.addEventListener("click", () => {
    // Hide the modal by setting its display property to "none"
    deleteNodeModal.style.display = "none";
  });


// JavaScript code to close the custom modal
document.getElementById('closeCustomModal').addEventListener('click', function () {
  var customModal = document.getElementById('customModal');
  customModal.style.display = 'none';
});

// JavaScript code to close the vehicle configuration modal
document.getElementById('closeVehicleConfigModal').addEventListener('click', function () {
  var vehicleConfigModal = document.getElementById('vehicleConfigModal');
  vehicleConfigModal.style.display = 'none';
});


document.addEventListener("DOMContentLoaded", function () {
  const fileButton = document.getElementById("file-button");
  const actionsButton = document.getElementById("actions-button");
  const fileButtonGroup = document.getElementById("file-button-group");
  const actionsButtonGroup = document.getElementById("actions-button-group");

  fileButton.addEventListener("click", () => {
    toggleButtonGroup(fileButtonGroup);
    closeButtonGroup(actionsButtonGroup);
  });

  actionsButton.addEventListener("click", () => {
    toggleButtonGroup(actionsButtonGroup);
    closeButtonGroup(fileButtonGroup);
  });

  function toggleButtonGroup(group) {
    const isVisible = group.style.display === "block";
    group.style.display = isVisible ? "none" : "block";
  }

  function closeButtonGroup(group) {
    group.style.display = "none";
  }
});



// Get references to the button groups
const fileButtonGroup = document.getElementById('file-button-group');
const actionsButtonGroup = document.getElementById('actions-button-group');

// click event listeners to buttons within the groups
document.getElementById('importButton').addEventListener('click', () => {
  fileButtonGroup.style.display = 'none'; // Hide the file-button-group
});

document.getElementById('exportButton').addEventListener('click', () => {
  fileButtonGroup.style.display = 'none'; // Hide the file-button-group
});

document.getElementById('saveGeoJSONButton').addEventListener('click', () => {
  fileButtonGroup.style.display = 'none'; // Hide the file-button-group
});

document.getElementById('deleteNodeButton').addEventListener('click', () => {
  actionsButtonGroup.style.display = 'none'; // Hide the actions-button-group
});

document.getElementById('deleteAllNodesButton').addEventListener('click', () => {
  actionsButtonGroup.style.display = 'none'; // Hide the actions-button-group
});

document.getElementById('showSpecificLogButton').addEventListener('click', () => {
  actionsButtonGroup.style.display = 'none'; // Hide the actions-button-group
});