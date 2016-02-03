## Mapbox GL Synced Dual Maps
The visualization demonstrates how to syncronize the state of two side-by-side Mapbox GL based maps. As the user interacts with one of the two maps, the state of the map (center position, zoom level, pitch and bearing) is dynamically copied to the second map (and vice versa). The code also demonstrates how to prevent call stack overflow due to recursive event handler triggering when the map state is updated.

The dataset is based on driver license suspensions from California DMV and East Bay Community Law Center. See prior visualization [here](http://bl.ocks.org/boeric/4d62de0846a2554b113b)

See the script in action at bl.ocks.org/boeric [here](http://bl.ocks.org/boeric/f6ddea14600dc5093506/), and fullscreen [here](http://bl.ocks.org/boeric/raw/f6ddea14600dc5093506/)