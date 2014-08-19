/*
 *  Project: Fetch Responsive Image jQuery plugin
 *  Description: Mediator between user interface and webserver, with the goal to get images sized to match the current state of the interface.
 *  Version: 0.1.2
 *  Author: (c) 2014 Arthur Clemens arthurclemens@gmail.com
 *  License: MIT license
 *  URL: https://github.com/ArthurClemens/jquery-fetch-responsive-plugin
 */

// https://github.com/jquery-boilerplate/jquery-boilerplate/wiki/Extending-jQuery-Boilerplate

;(function ($, window, document, undefined) {

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window is passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    var pluginName = 'responsive',
        resizeTimer,
        isListeningForResize,
        uniqueId = 1,
        uniqueDataKey = "jquery-fetch-responsive",
        images = {},
        
        // functions
        parseValue,
        parseIntegerValue,
        parseFloatValue,
        parseBooleanValue,
        parseRangeValue,
        parseArrayValue,
        parseValues,
        purgeData,
        purgeSendData,
        createWidthList,
        isHighResolution,
        listenForResize;

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;
        this.$element = $(element);

        this.options = $.extend({}, $.fn[pluginName].defaults, options) ;
        this._defaults = $.fn[pluginName].defaults;
        this._name = pluginName;

        this.init();
    }

    Plugin.prototype.init = function () {
        var options,
            sendData;
        
        options = $.extend({}, this.options, this.$element.data()); // The first object is generally empty as we don't want to alter the default options for future instances of the plugin
        parseValues(options);
        if (options.range) {
            createWidthList(options);
        }
        purgeData(options);
        sendData = $.extend({}, options);
        purgeSendData(sendData);
        
        this.$element.attr("data-" + uniqueDataKey, uniqueId);
        images[uniqueId++] = {
            options: options,
            sendData: sendData,
            $el: this.$element
        };
        listenForResize();
        prepareUpdate(this.$element, options, sendData);
    };

    parseValue = function(optKey, type, opts) {
        var value,
            parsed;
        value = opts[optKey];
        if (value !== undefined && value !== "") {
            if (type === "integer") {
                parsed = parseIntegerValue(value);
            } else if (type === "float") {
                parsed = parseFloatValue(value);
            } else if (type === "boolean") {
                parsed = parseBooleanValue(value);
            } else if (type === "range") {
                parsed = parseRangeValue(value);
            } else if (type === "array") {
                parsed = parseArrayValue(value);
            }
            if (parsed !== undefined) {
                opts[optKey] = parsed;
            }
        }
    };
    
    parseIntegerValue = function(value) {
        return parseInt(value, 10);
    };
    
    parseFloatValue = function(value) {
        return parseFloat(value, 10);
    };
    
    parseBooleanValue = function(value) {
        return (value === true || value === "true" || value === 1 || value === "1") ? true : false;
    };
    
    parseRangeValue = function(value) {
        if (typeof value === "object" && value.min !== undefined && value.max !== undefined) {
            return value;
        } else {
            var match = new RegExp(/(\d+)\s*[-, ]\s*(\d+)/).exec(value);
            return {
                min: parseInt(match[1], 10),
                max: parseInt(match[2], 10)
            };
        }
    };
    
    parseArrayValue = function(value) {
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
        return list.sort(function(a, b) {
            return b - a;
        });
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
    
    getHighResolutionValue = function(value, data, $el) {
        if (typeof value === "function") {
            return value(data, $el);
        } else if (value === "auto") {
            return $.responsive._detectedHighResolution;
        } else {
            return parseBooleanValue(value);
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
            if (options.highResolution !== undefined) {
                // would be nice if this was optimized a bit
                // for static values
                sendDataCopy.highResolution = getHighResolutionValue(options.highResolution, sendDataCopy, $el);
            }
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
            url = options.urlSource(sendData, $el);
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

    /*
    https://github.com/LeaVerou/dpi/blob/gh-pages/dpi.js
    */
    isHighResolution = function() {
        var dppx = window.devicePixelRatio ||
    (window.matchMedia && window.matchMedia("(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)").matches? 2 : 1) || 1;
        return dppx > 1.5;
    };
    
    // You don't need to change something below:
    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations and allowing any
    // public function (ie. a function whose name doesn't start
    // with an underscore) to be called via the jQuery plugin,
    // e.g. $(element).defaultPluginName('functionName', arg1, arg2)
    $.fn[pluginName] = function (options) {
        var args = arguments;

        // Is the first parameter an object (options), or was omitted,
        // instantiate a new instance of the plugin.
        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                // Only allow the plugin to be instantiated once,
                // so we check that the element has no plugin instantiation yet
                if (!$.data(this, 'plugin_' + pluginName)) {

                    // if it has no instance, create a new one,
                    // pass options to our plugin constructor,
                    // and store the plugin instance
                    // in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
                }
            });

        // If the first parameter is a string and it doesn't start
        // with an underscore or "contains" the `init`-function,
        // treat this as a call to a public method.
        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

            // Cache the method call
            // to make it possible
            // to return a value
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                // Tests that there's already a plugin-instance
                // and checks that the requested public method exists
                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    // Call the method of our plugin instance,
                    // and pass it the supplied arguments.
                    returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                  $.data(this, 'plugin_' + pluginName, null);
                }
            });

            // If the earlier cached method
            // gives a value back return the value,
            // otherwise return this to preserve chainability.
            return returns !== undefined ? returns : this;
        }
    };
    
    $.fn[pluginName].defaults = {
        urlSource: undefined,
        range: undefined,
        stepSize: 160,
        widths: undefined,
        ratio: undefined,
        update: undefined,
        getWidth: function($el, _data) {
            return parseInt($el.css("max-width"), 10) || $el.width();
        },
        mediaQuery: undefined,
        highResolution: undefined
    };
    
    $[pluginName] = function (options) {
        $.extend($.fn.responsive.defaults, options);
	};
    $[pluginName].resizeDelay = 500;
    $[pluginName]._detectedHighResolution = isHighResolution();

}(jQuery, window, document));