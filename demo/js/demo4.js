jQuery(document).ready(function($) {
    var IMAGE_URL = "img/orion-{width}.jpg",
        COUNT = 1000,
        counter = COUNT,
        $figure,
        $img;
        
    while (counter > 0) {
        $figure = $("<figure></figure>").addClass("my-image");
        $img = $("<img></img>");
        $figure.append($img);
        $("#test").append($figure);
        counter--;
    }
     
    // set global settings
    // this settings object can also be passed in the element call below
    $.responsive({
        urlSource: function(data) {
            var url = IMAGE_URL.replace("{width}", data.width);
            return url;
        }
    });
    
    $("figure.my-image").responsive({
        widths: [320,480,640,800,960,1120]
    });
});
