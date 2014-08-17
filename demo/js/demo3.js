jQuery(document).ready(function($) {
    var DEMO_IMAGE = "img/copernicus.png",
        $genImage,
        genImage,
        genCanvas;
    
    $genImage = $("<img></img>").css({
        position: "absolute",
        left: -999999,
    });
    $("body").append($genImage);
    genImage = $genImage[0];
    genImage.crossOrigin = "Anonymous";
    
    genCanvas = document.createElement("canvas");

    var generateThumbnail = function($el, width, height, onDone) {
        var img = genImage;
        var canvas = genCanvas;
        img.src = "";
        img.src = DEMO_IMAGE;
        img.onload = function() {
            canvas.width = width;
            if (height === undefined) {
                var ratio = img.width / img.height;
                canvas.height = width / ratio;
            } else {
                canvas.height = height;
            }
            var horizontalScale = 1 / img.width * canvas.width;
            var verticalCropScale = (1 / img.height * canvas.height) / horizontalScale;
            var sx = 0;
            var sy = 0;
            var sWidth = img.width;
            var sHeight = img.height;
            var dx = 0;
            var dy = 0;
            var dWidth = canvas.width;
            var dHeight = height / verticalCropScale;
            canvas.getContext("2d").drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            $el.attr("src", canvas.toDataURL("image/jpg"));
            if (onDone) {
                onDone();
            }
        }
    };
    
    $.responsive({
        urlSource: function(data) {
            $("#image-input").text(data.width);
            $("#data-received").text(new Date().toLocaleTimeString("en-US", {hour12: false}));
            // we must pass a unique id
            return data.width.toString();
        },
        update: function($el, data) {
            generateThumbnail($el, data.width, data.height, function() {
                $("#update-time").text(new Date().toLocaleTimeString("en-US", {hour12: false}));
            });
        }
    });
    
    $("img.my-image").responsive();
});
