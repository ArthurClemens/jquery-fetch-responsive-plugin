jQuery(document).ready(function($) {
    var IMAGE_URL = "img/orion-{width}.jpg";
    
    var evenRows = function() {
        var highest = 0;
        $(".column .note").css({
            height: "auto"
        });
        setTimeout(function() {
            $(".column .note").each(function() {
                var h = $(this).outerHeight();
                highest = Math.max(highest, h);
            });
            $(".column .note").css({
                height: highest
            });
        }, 0);
    };
    
    var writeInfo = function(sizeId, width, highResolution, url, $parent) {
        $(".image-input", $parent).text(width + ", " + sizeId + ", high resolution: " + highResolution);
        $(".image-source", $parent).text(url);
        $(".input-time", $parent).text(new Date().toLocaleTimeString("en-US", {hour12: false}));
        evenRows();
    };
    
    // set global settings
    // this settings object can also be passed in the element call below
    $.responsive({
        range: "320-640",
        mediaQuery: true,
        urlSource: function(data, $el) {
            var sizeStr = data.highResolution ? data.width + "@2x" : data.width.toString();
            var url = IMAGE_URL.replace("{width}", sizeStr);
            writeInfo(data.sizeId, data.width, data.highResolution, url, $el.closest(".column"))
            return url;
        }
    });
    
    $("img.my-image").responsive();
});
