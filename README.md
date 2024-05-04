Route Management and Optimization System for Vehicles

This program is a route management and optimization system for vehicles, such as buses or mass 
transit vehicles. Its primary feature is the ability to find the optimal route for each vehicle 
to serve a series of points of interest (stops) in the most efficient way.

Each point of interest represents a stop for vehicles and stores information such as the name,
stop color, start and arrival times, as well as geographical coordinates. These stops are connected
to each other via routes (edges) representing the path each vehicle should follow.

Route optimization is achieved using the OpenRouteService, which provides information and optimal 
routes based on current traffic and other factors. The system utilizes OpenRouteService to determine
the best routes for vehicles to serve all stops in the shortest possible time.

Neo4j is used as the database to store static information about stops (name, geographical coordinates,times)
and dynamic information such as the route each vehicle follows.

The system offers user-friendly interfaces for creating, updating, and deleting stops, allowing users
to manage stops efficiently. Additionally, it dynamically updates the map with the positions of
vehicles during route execution.

To run the program, the user needs to configure their API settings in the configApis/config.js file,
where they should replace the provided credentials with their own for Neo4j and OpenRouteService. 
After configuration, the code can be executed using the following command:

python -m http.server

Once the server is running, open your web browser and enter the following URL in the address bar:
http://localhost:8000/web/frontend/homePage.html

This will open the program's homepage in your web browser, allowing you to interact 
with the route management and optimization system for vehicles .