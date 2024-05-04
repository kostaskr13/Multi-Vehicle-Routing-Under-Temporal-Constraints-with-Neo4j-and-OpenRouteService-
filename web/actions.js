import {nodesMarkerConf,driver,resetNodes, updateMarkersOnMap,sharedData,loadNodesFromNeo4j,nodesConf} from "./main.js"
import { showMessage, resetVehicleConfigForm,customAlert} from './tools.js';
import * as config from './configApis/config.js';



// Event listener for the "Delete All Nodes" button
document.getElementById("deleteAllNodesButton").addEventListener("click", deleteAllNodesWithConfirmation);


// Function to delete all nodes from the map and Neo4j database with confirmation dialog
function deleteAllNodesWithConfirmation() {
  // Display a confirmation dialog to the user
  const confirmDelete = confirm("Are you sure you want to delete all nodes?");

  if (confirmDelete) {
    // User confirmed, proceed with deletion
    deleteAllNodes();
  } else {
    // User canceled, do nothing
    console.log("Node deletion canceled by the user.");
  }
}


// Function to delete all nodes from the map and Neo4j database
function deleteAllNodes() {
  // Remove all markers from the map
  nodesMarkerConf.nodeMarkers.forEach(marker => marker.remove());
  nodesMarkerConf.nodeMarkers.length = 0;

  // Delete all nodes from the Neo4j database
  const session = driver.session({ database: config.neo4jDatabase });
  const deleteAllNodesQuery = "MATCH (n:Node) DETACH DELETE n";
  session
    .run(deleteAllNodesQuery)
    .then(result => {
      showMessage("All stops deleted successfully",2);
      console.log("All nodes deleted from Neo4j:", result.summary.counters.nodesDeleted);
      resetVehicleConfigForm();
      resetNodes();
      // Update the markers on the map after deleting nodes
      updateMarkersOnMap();
    })
    .catch(error => {
      console.error("Error deleting nodes from Neo4j:", error);
    })
    .finally(() => {
      session.close();
    });

}



// Event listener for the "Delete Node" button inside the modal
document.getElementById("confirmDeleteNodeButton").addEventListener("click", () => {
    // Get the node name from the input field
    const nodeName = document.getElementById("deleteNodeName").value;
  
    if (nodeName.trim() === "") {
      
      customAlert("Please enter a valid node name.");
      return;
    }
  
    // Close the delete node modal
    const deleteNodeModal = document.getElementById("deleteNodeModal");
    deleteNodeModal.style.display = "none";
  
    // Call the function to delete the node by name
    deleteNodeFromNeo4jBymyNodeName(nodeName);

  // Reset the input field and label
  document.getElementById("deleteNodeName").value = "";
  document.getElementById("deleteNodeLabel").textContent = "Enter the name of the node you want to delete:";
  });
  

  // Function to delete a node from Neo4j by name
  function deleteNodeFromNeo4jBymyNodeName(name) {

  loadNodesFromNeo4j();
  const session = driver.session({ database: config.neo4jDatabase });
  
  const deleteNodeQuery = `
    MATCH (n:Node {name: $name})
    DETACH DELETE n
  `;
  
  session
    .run(deleteNodeQuery, { name: name })
    .then(() => {
      if(nodesConf.endNodesAr.includes(name) && nodesConf.startNodesAr.includes(name) ){
        sharedData.deleteStartEnd=1;
        resetVehicleConfigForm();
        nodesConf.startNodesAr.pop(name);
        nodesConf.endNodesAr.pop(name);
      }
      else if(nodesConf.endNodesAr.includes(name) )
      {
        sharedData.deleteStartEnd=1;
        resetVehicleConfigForm();
        nodesConf.endNodesAr.pop(name);
  
      }else if(nodesConf.startNodesAr.includes(name)){
        sharedData.deleteStartEnd=1;
        resetVehicleConfigForm();
        nodesConf.startNodesAr.pop(name);
      }else {
        sharedData.deleteStartEnd=0;
      }
      let nameText="";
        nameText=name;
    
      resetNodes();
      updateMarkersOnMap();

      // Remove the marker associated with the deleted node from the map
      const markerToRemove = nodesMarkerConf.nodeMarkers.find(marker => marker.options.name === name);
      if (markerToRemove) {
      
        showMessage("Stop "+nameText+" deleted successfully",2);
        console.log("Node deleted from Neo4j by name:", name);

        markerToRemove.remove(); // Remove the marker from the map
        nodesMarkerConf.nodeMarkers.splice(nodesMarkerConf.nodeMarkers.indexOf(markerToRemove), 1); // Remove from the array
        
        console.log("Marker removed from the map by name:", name);
  
  
        // Update the markers on the map
      } else { 
        showMessage("Stop "+nameText+" not found on the map ",2);

        console.log("Marker not found on the map for name:", name);
      }
    })
    .catch(error => {
      console.error("Error deleting node from Neo4j by name:", error);
    })
    .then(() => {
      session.close();
    });
  
  }
  
  
  
  
  