# Fetch Responsive Image jQuery plugin

Mediator between user interface and webserver, with the goal to get images sized to match the current state of the interface.


## Motivation

* The user interface changes all the time: windows get resized, mobile screens rotated.
* The user interface needs to set the demand for the image size - client side code is active; backend code passive.
* CSS is not suited to handle image urls; it is not possible to set the image `src` (and using `background-image` is not the same thing).
* Sometimes image sizing needs to be more dynamic, for instance to define more sizes than the defined widths offer.
* Image urls are often more complex than can be defined in static CSS - for instance for generating a thumbnail using ImageMagick parameters.

This plugin mediates the desired image width:

* It calculates the image size candidates
* Checks the current window width
* Finds the nearest image size candidate
* Sends a request to the server
* Handles the received image url


## How it works

1. On first view and with each following window resize, the plugin calculates the desired image size. How the calculation should be done is configurable.
1. If the image has a different size than the desired size (image needs an update), "size data" is sent to the webserver (JSON).
1. The webserver receives the JSON data, generates a resized image or looks up an existing image, and returns the image URL.
1. When the image URL is received, the image source is automatically updated (unless configured otherwise).

The webserver needs to be coded separately, and not a part of this plugin. However, the the demo contain several example "server" implementation in Javascript to try out things.


## Demo

* [Demo 1: list of widths]( http://arthurclemens.github.io/jquery-fetch-responsive-plugin/demo1.html)
* [Demo 2: detect breakpoint changes]( http://arthurclemens.github.io/jquery-fetch-responsive-plugin/demo2.html)
* [Demo 3: create widths from range]( http://arthurclemens.github.io/jquery-fetch-responsive-plugin/demo3.html)
* [Demo 4: stress test]( http://arthurclemens.github.io/jquery-fetch-responsive-plugin/demo4.html)
* [Demo 5: high resolution images]( http://arthurclemens.github.io/jquery-fetch-responsive-plugin/demo5.html)


## Usage

Register element:

    $("img").responsive();
    
or

    $("img").responsive(options);


### 1: HTML data attributes

Use `data` attributes and call without arguments:

In HTML:

    <img class="my-image" data-widths="320,480,640,800,960" />

In Javascript: 

    $("img.my-image").responsive();

Optionally set global options first, see below.


### 2: Javascript options object

    $("img.my-image").responsive({
        widths: "320,480,640,800,960"
    });


## Instance options

### All options

* [getWidth](#getwidth)
* [highResolution](#highresolution)
* [highResolutionMaximum](#highresolutionmaximum)
* [mediaQuery](#mediaquery)
* [range](#range)
* [ratio](#ratio)
* [stepSize](#stepsize)
* [update](#update)
* [urlSource](#urlsource)
* [widths](#widths)


### Size options

Either use:

1. `widths`
1. `mediaQuery`
1. `range`


### widths

*list of integers*

`widths` is essentially a list of breakpoints for the image. At each window size change, the nearest upper breakpoint size is taken.

Example:

    <img data-widths="320,480,640,800,960" />

or 

    $("img").responsive({
        widths: "320,480,640,800,960"
    });
    
or

    $("img").responsive({
        widths: [320,480,640,800,960]
    });
    
    
### mediaQuery

*boolean*

If true, changes in media query are detected. All size information is kept in CSS only.

This uses the technique outlined by [Brett Jankord](http://www.brettjankord.com/2012/11/15/syncing-javascript-with-your-active-media-query/) to keep track of the current media query in Javascript.<br />
It requires 2 CSS declarations for each media query (to satisfy both modern browsers and Opera):

    head {font-family:"XS";}
    body:after {content:"XS"; display:none;}

    @media (min-width: 480px) {
        head {font-family:"S";}
        body:after{content:"S";}
    }
    
    etcetera
    
At a media query change, the width of the element is detected and passed to the server.

For the calculation of the current size, by default the css value for <code>max-width</code> is taken with fallback <code>$el.width()</code>; this can be overridden with function <code>getWidth</code>.<br />
Using <code>max-width</code> leaves the <code>width</code> attribute for stretching the image to fit the parent container.

            
The corresponding media query identifier is also sent in data attribute `sizeId`.

Example:

    <img data-media-query="true" />

or 

    $("img").responsive({
        mediaQuery: true
    });


### range

*2 integers separated by minus character* or *object with keys min, max*

Range from mininum to maximum width. Passing a range automatically generates a list of widths (compared to the hardcoded list with parameter `widths`). Optional parameter `step-size` (default 160) is used to calculate the number of size steps between the range min and max values.

Example:

    <img data-range="320-960" />

or 

    $("img").responsive({
        range: "320-960"
    });
   
or

    $("img").responsive({
        range: {
            min: 320,
            max: 960
        }
    });


### stepSize

*integer*

Approximate number of pixels in between sizes ("breakpoints"). Only used with `range`. This value defines the number of size steps between the range min and max values. If the resulting steps is a fraction, the upper bound is selected (resulting in a smaller final step size). Default value: 160.

Note: a too small step size will result in a large number of image sizes generated by the server.


Example:

    <img data-step-size="80" />

or 

    $("img").responsive({
        stepSize: 80
    });


### ratio

*float*

Width to height ratio to calculate the image height. If not set, data attribute `height` will be undefined.

Example:

    <img data-ratio="1.7777777777777777" />

or 

    $("img").responsive({
        ratio: 16/9
    });
    

### urlSource

*URL string* or *function*

#### urlSource as webserver URL

Location where image URL will be returned. This will normally be a webserver address.

A webserver URL will normally be set in a global option.

Data is sent as JSON GET request with key `request` and contains:

* `width`
* `height` (may be undefined)
* `sizeId`
* `highResolution` (if set)
* plus any other parameter that is set in data attributes or the options object

Example URL:

    $.responsive({
        urlSource: "/api/image-data"
    });

#### urlSource as Javascript function

*function* - params *data, $el* - return *string*

This function is called to fetch the image url instead. 

Data is sent as Javascript object and contains:

* `width`
* `height` (may be undefined)
* `sizeId`
* `highResolution` (if set)
* plus any other parameter that is set in data attributes or the options object

The function is expected to return a URL.<br />
In case the image URL is updated in the `update` function, at least a width or unique ID must be returned so that changes can be detected on window resize.

Example Function:

    $.responsive({
        urlSource: function(data, $el) {
            return "image-" + data.width + ".jpg";
        }
    });


### update

*function* - params *$el, data*

Called when the image URL is received from the server. This function is normally not needed; by default the passed image `src` attribute is set to the received image url - this allows the use of data attributes without having to write a javascript function to handle the image url - after all most of the time the only thing to do is update the img src.

Setting `update` overrides the default behaviour and the image is not updated automatically.

`data` contains:

* width
* height
* sizeId
* url

Example:

    $.responsive({
        update: function($el, data) {
            $el.attr("src", data.url);
        }
    });


### getWidth

*function* params *$el, data* - return *integer*

Function to return the element width if `$el.css("max-width")` or `$el.width()` would result in a wrong size (for instance when the image width is set to a percentage).

`data` contains:

* width
* height
* sizeId
* url

Example:

    $.responsive({
        getWidth: function($el, data) {
            return $el.parent().width();
        }
    });


### highResolution

*boolean* or *"auto"*

#### highResolution as boolean

Pass this as parameter to the server; the calculated width does not change (the server needs to serve a high resolution sized image).

    <img data-high-resolution="1" />
    
#### highResolution as string "auto"

Detect if the display is a high resolution and pass the result to the server.

    <img data-high-resolution="auto" />

### highResolutionMaximum

*integer*

Conditionally disable high resolution images, for example to prevent too large downloads. Pass the maximum width to use high resolution images; at greater widths high resolution will be disabled.

Use together with `highResolution`.

Example:

    <img data-high-resolution="auto" data-high-resolution-maximum="1024" />

or

    $.responsive({
        highResolution: "auto",
        highResolutionMaximum: "1024"
    }


## Passing data to the server

Other parameters to pass to the server (for instance for ImageMagick) can be passed either with data attributes or in the options object.

Example:

    <img data-mediaclass="product-detail" data-magick-crop="north" />

or 

    $("img").responsive({
        mediaclass: "product-detail",
        magickCrop: "north"
    });



## Global options

Global options can be set using `$.responsive.xyz` notation. For instance:

    $.responsive.urlSource = "/api/image-data";


### resizeDelay

*integer*

Number of ms to wait after a window resize event; default: 500.

Example:

    $.responsive.resizeDelay = 200;
