jQuery(document).ready(function($) {
    var IMAGE_URL = "http://maps.googleapis.com/maps/api/staticmap?size={width}x{height}&maptype={map_type}&center={location_lat},{location_long}&zoom={zoom}&scale={scale}",
        MAP_TYPE = "terrain",
        MAP_LAT = 40.714728,
        MAP_LNG = -73.998672,
        MAP_ZOOM = 14;
    
    var writeInfo = function(sizeId, width, highResolution, url, $parent) {
        $(".image-input", $parent).text(width + ", high resolution: " + highResolution);
        $(".image-source", $parent).text(url);
        $(".input-time", $parent).text(new Date().toLocaleTimeString("en-US", {hour12: false}));
    };
    
    // set global settings
    // this settings object can also be passed in the element call below
    $.responsive({
        urlSource: function(data, $el) {
            // return a unique id for this size
            return data.width.toString();
        },
        update: function($el, data) {
            var url,
                scale = data.highResolution ? 2 : 1;
                
            url = IMAGE_URL.replace("{width}", Math.floor(data.width));
            url = url.replace("{height}", Math.floor(data.height));
            url = url.replace("{map_type}", MAP_TYPE);
            url = url.replace("{location_lat}", MAP_LAT);
            url = url.replace("{location_long}", MAP_LNG);
            url = url.replace("{zoom}", MAP_ZOOM);
            url = url.replace("{scale}", scale);
            $el.attr("src", url);
            writeInfo(data.sizeId, data.width, data.highResolution, url, $(".note-content"));
        }
    });
    
    $("img.my-image").responsive();
});
