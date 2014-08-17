jQuery(document).ready(function($) {
    var IMAGE_URL = "img/orion-{width}.jpg";
    
    // set global settings
    // this settings object can also be passed in the element call below
    $.responsive({
        urlSource: function(data) {
            // widths are set in CSS, so sizes need to correspond
            // again this is easier with a webserver that generates images
            // for the demo we will use the list of locally stored images
            var url = IMAGE_URL.replace("{width}", data.width);
            $("#image-input").text(data.sizeId + ", " + data.width);
            $("#image-source").text(url);
            $("#input-time").text(new Date().toLocaleTimeString("en-US", {hour12: false}));
            // because we are emulating a webserver, we don't change the image source here
            // instead we just return the url
            return url;
        }
    });
    
    $("img.my-image").responsive();
});
