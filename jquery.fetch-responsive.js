/*
Fetch Responsive Image jQuery plugin
Mediator between user interface and webserver, with the goal to get images sized to match the current state of the interface.
Version 0.1.1
(c) 2014 Arthur Clemens arthurclemens@gmail.com
Released under MIT licence
https://github.com/ArthurClemens/jquery-fetch-responsive-plugin
*/
(function ($) {
    "use strict";

    var resizeTimer,
        isListeningForResize,
        uniqueId = 1,
        uniqueDataKey = "jquery-fetch-responsive",
        images = {},
        
        // functions
        parseValue,
        parseValues,
        purgeData,
        purgeSendData,
        createWidthList,
        init,
        listenForResize,
        stopListenForResize,
        handleResize,
        prepareUpdate,
        fetchData,
        needsUpdate,
        widthForRange,
        widthForWidthList,
        callServer,
        handleReceivedUrl,
        updateImageSrc,
        updateImageProperties,
        getMediaQuery;

    parseValue = function(optKey, type, opts) {
        var value,
            parsed;
        value = opts[optKey];
        if (value !== undefined && value !== "") {
            if (type === "integer") {
                parsed = parseInt(value, 10);
            } else if (type === "float") {
                parsed = parseFloat(value, 10);
            } else if (type === "boolean") {
                parsed = (value === true || value === "true" || value === 1 || value === "1") ? true : false;
            } else if (type === "range") {
                if (typeof value === "object" && value.min !== undefined && value.max !== undefined) {
                    parsed = value;
                } else {
                    var match = new RegExp(/(\d+)\s*[-, ]\s*(\d+)/).exec(value);
                    parsed = {
                        min: parseInt(match[1], 10),
                        max: parseInt(match[2], 10)
                    };
                }
            } else if (type === "array") {
                var list;
                if (Array.isArray(value)) {
                    list = value;
                } else {
                    // handle list of integers
                    list = value.split(/\s*,\s*/);
                    if (list.length) {
                        for (var i = 0; i<list.length; i++) {
                            list[i] = parseInt(list[i], 10);
                        }
                    }
                }
                // sort numerically, from large to small
                parsed = list.sort(function(a, b) {
                    return b - a;
                });
            }
            if (parsed !== undefined) {
                opts[optKey] = parsed;
            }
        }
    };
    
    /*
    Parses attribute values other than string and function.
    */
    parseValues = function(opts) {
        parseValue("widths", "array", opts);
        parseValue("mediaQuery", "boolean", opts);
        parseValue("range", "range", opts);
        parseValue("stepSize", "integer", opts);
        parseValue("ratio", "float", opts);
    };
    
    /*
    Remove attributes that are no longer needed.
    */
    purgeData = function(data) {
        delete data.stepSize;
        delete data.range;
    };
    
    /*
    Remove attributes that are not needed to send over.
    */
    purgeSendData = function(data) {
        delete data.urlSource;
        delete data.range;
        delete data.stepSize;
        delete data.widths;
        delete data.ratio;
        delete data.update;
        delete data.getWidth;
        delete data.mediaQuery;
    };
    
    createWidthList = function(options) {
        var stepSize,
            sizeRange,
            stepCount,
            finalStepSize,
            widths = [],
            width;
        stepSize = options.stepSize;
        sizeRange = options.range.max - options.range.min;
        stepCount = Math.ceil(sizeRange / stepSize);
        finalStepSize = sizeRange / stepCount;
        for (var i = 0; i<=stepCount; i++) {
            width = options.range.min + i * finalStepSize;
            widths.push(parseInt(width, 10));
        }
        options.widths = widths.reverse();
    };
    
    init = function (el, opts) {
        var $el,
            options,
            sendData;
        
        $el = $(el);
        options = $.extend({}, $.fn.responsive.defaults, opts, $el.data());
        parseValues(options);
        if (options.range) {
            createWidthList(options);
        }
        purgeData(options);
        
        sendData = $.extend({}, options, $el.data());
        purgeSendData(sendData);
        
        $el.attr("data-" + uniqueDataKey, uniqueId);
        images[uniqueId++] = {
            options: options,
            sendData: sendData,
            $el: $el
        };
        listenForResize();
        prepareUpdate($el, options, sendData);
    };
    
    listenForResize = function() {
        if (isListeningForResize) {
            return;
        }
        $(window).on("resize", function() {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(function() {
                handleResize();
            }, $.responsive.resizeDelay);
        });
        isListeningForResize = true;
    };
    
    stopListenForResize = function() {
        clearTimeout(resizeTimer);
        $(window).off("resize");
        isListeningForResize = false;
    };
    
    handleResize = function() {
        var img;
        for (var prop in images) {
            img = images[prop];
            prepareUpdate(img.$el, img.options, img.sendData);
        }  
    };
    
    prepareUpdate = function($el, options, sendData) {
        var windowWidth,
            sizeId,
            width,
            height;
        
        windowWidth = Math.round($(window).width());
        if (options.mediaQuery) {
            sizeId = getMediaQuery();
            width = options.getWidth($el, sendData);
        } else if (options.widths) {
            width = widthForWidthList(options.widths, windowWidth);
            sizeId = width.toString();
        } 
        if (needsUpdate($el, sizeId)) {
            if (height === undefined && options.ratio) {
                height = width / options.ratio;
            }
            // make a copy to not store width and height permanently
            var sendDataCopy = $.extend({}, sendData);
            sendDataCopy.sizeId = sizeId;
            sendDataCopy.width = width;
            sendDataCopy.height = height;
            fetchData($el, options, sendDataCopy);
        }
    };
    
    widthForWidthList = function(widthList, windowWidth) {
        // get nearest
        // assume reverse ordered list
        var width = widthList[0];
        // skip first
        for (var i=1; i<widthList.length; i++) {
            if (widthList[i] < windowWidth) {
                break;
            }
            width = widthList[i];
        }
        return width;
    };
    
    needsUpdate = function($el, sizeId) {
        if ($el.data("size-id") !== sizeId) {
            return true;
        }
        return false;
    };
    
    fetchData = function($el, options, sendData) {
        var url;
        if (typeof(options.urlSource) === "function") {
            // direct call; no need for JSON
            url = options.urlSource(sendData);
            handleReceivedUrl($el, url, options, sendData);
        } else if (typeof(options.urlSource) === "string") {
            // assume url
            callServer($el, options.urlSource, options, sendData);
        } else {
            if (console) {
                console.log("Invalid value for: url-source");
            }
        }
    };
    
    callServer = function($el, serverUrl, options, sendData) {
        $.ajax({
            url: serverUrl,
            type: "get",
            dataType: "json",
            data: {
                request: JSON.stringify(sendData)
            }
        })
        .done(function(data, _textStatus, _jqXHR) {
            if (data.error) {
                if (console) {
                    console.log(data.error);
                }
            } else {
                handleReceivedUrl($el, data.url, options, sendData);
            }
        })
        .fail(function(_jqXHR, _textStatus, _errorThrown) {
            if (console) {
                console.log("Could not get url");
            }
        });
    };
    
    handleReceivedUrl = function($el, imageUrl, options, sendData) {
        updateImageProperties($el, sendData.sizeId);
        if (options.update) {
            options.update($el, $.extend({url: imageUrl}, sendData));
        } else {
            updateImageSrc($el, imageUrl);
        }
    };
    
    updateImageSrc = function($el, url) {
        if ($el.is("img")) {
            $el.attr("src", url);
        } else {
            $el.find("img").attr("src", url);
        }
    };
    
    updateImageProperties = function($el, sizeId) {
        $el.data("size-id", sizeId);
    };
    
    /*
    Brett Jankord
    http://www.brettjankord.com/2012/11/15/syncing-javascript-with-your-active-media-query/  
    Removed code for IE8.
    */
    getMediaQuery = function() {
        var mediaQuery;
        if (window.opera) {
            mediaQuery = window.getComputedStyle(document.body, ":after").getPropertyValue("content");
        } else if (window.getComputedStyle) {
            // For all other modern browsers
            mediaQuery = window.getComputedStyle(document.head, null).getPropertyValue("font-family");
        }
        return mediaQuery;
    };
    
    $.fn.responsive = function (command) {
        return this.each(function () {
            init(this, command);
        });
    };
    
    /*
    Override default settings for plugin.
    */
    $.responsive = function (options) {
        $.extend($.fn.responsive.defaults, options);
	};

    $.responsive.resizeDelay = 500;
    
    $.fn.responsive.defaults = {
        urlSource: undefined,
        range: undefined,
        stepSize: 160,
        widths: undefined,
        ratio: undefined,
        update: undefined,
        getWidth: function($el, _data) {
            return parseInt($el.css("max-width"), 10) || $el.width();
        },
        mediaQuery: undefined
    };

}(jQuery));

/*jslint regexp: true, browser: true */