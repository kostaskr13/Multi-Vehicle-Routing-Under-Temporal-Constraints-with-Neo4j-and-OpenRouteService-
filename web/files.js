import {createNodeInNeo4j,loadNodesFromNeo4j ,driver ,nodesMarkerConf} from "./main.js"
import * as config from './configApis/config.js';


  // Event listener for the "Import CSV" button
  document.getElementById("importButton").addEventListener("click", () => {
  // Clear the file input by resetting its value
  document.getElementById("importFileInput").value = "";
  // Trigger the click event on the hidden file input element
   document.getElementById("importFileInput").click();
  });

  // Event listener for the file input element
  document.getElementById("importFileInput").addEventListener("change", handleFileImport);

  // Function to handle the selected CSV file
 export function handleFileImport(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = handleFileContents;
      reader.readAsText(file);
    }
  }

  // Function to handle the contents of the imported CSV file
 export function handleFileContents(event) {
    const csvContent = event.target.result;
    const lines = csvContent.split("\n");
  
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const [name, latitude, longitude, streetName, streetNumber, nodeColor, startTime, endTime] = line.split(",");
  
      if (name && latitude && longitude) {
        console.log("Extracted data:", name, latitude, longitude);
        createNodeInNeo4j(name, latitude, longitude, streetName, streetNumber, nodeColor, startTime, endTime);
        
      }
    }
    loadNodesFromNeo4j();
  }


  
  // Event listener for the "Export CSV" button
  document.getElementById("exportButton").addEventListener("click", exportNodesToCSV);

  // Function to fetch nodes from Neo4j and export them as CSV
  async function exportNodesToCSV() {
    let session;

    try {
      session = driver.session({ database: config.neo4jDatabase });

      const query = `
        MATCH (n:Node)
        RETURN n.streetName AS streetName, n.latitude AS latitude, n.longitude AS longitude, n.streetNumber AS streetNumber, n.name AS name ,  n.nodeColor AS nodeColor ,n.startTime AS startTime,n.endTime AS endTime
      `;

      const result = await session.run(query);
      const nodes = result.records.map(record => record.toObject());
      const csvContent = processNodesForCSV(nodes);
      downloadCSVFile(csvContent);
    } catch (error) {
      console.error("Error fetching nodes from Neo4j:", error);
    } finally {
      if (session) {
        
        session.close();
      }
    }
    
  }

  // Function to process nodes and create CSV content
  function processNodesForCSV(nodes) {
    let csvContent = "name,latitude,longitude,streetName,streetNumber,nodeColor,startTime,endTime\n";
    for (const node of nodes) {
      const cleanedNodeColor = node.nodeColor.trim(); // Trim whitespace
      csvContent += `${node.name},${node.latitude},${node.longitude},${node.streetName},${node.streetNumber},${cleanedNodeColor},${node.startTime},${node.endTime}\n`;
    }
    return csvContent;
  }
  // Function to trigger the download of the CSV file
  function downloadCSVFile(csvContent) {
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nodes_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }




  
  document.getElementById("saveGeoJSONButton").addEventListener("click", () => {
    const geojsonFeatures = nodesMarkerConf.nodeMarkers.map(marker => {
      const { lat, lng } = marker.getLatLng();
      const streetName = marker.options.streetName || "";
      const streetNumber = marker.options.streetNumber || "";
      const name = marker.options.name || "";
      const nodeColor = marker.options.nodeColor || "";
      const startTime = marker.options.startTime || "";
      const endTime = marker.options.endTime || "";
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: {
          streetName,
          latitude: lat,
          longitude: lng,
          streetNumber,
          name,
          nodeColor,
          startTime,
          endTime,
          
        },
      };
    });
  
    // Create a GeoJSON FeatureCollection with the features
    const geojsonFeatureCollection = {
      type: "FeatureCollection",
      features: geojsonFeatures,
    };
  
    // Convert the GeoJSON data to a Blob
    const blob = new Blob([JSON.stringify(geojsonFeatureCollection)], {
      type: "application/json",
    });
  
    // Create a new File object from the Blob
    const file = new File([blob], "nodes.geojson");
  
    // Use the File API to save the data to the "nodes.geojson" file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.streetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log("File download initiated.");
  });
  