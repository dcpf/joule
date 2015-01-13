'use strict';

var fs = require('fs');
var _ = require('underscore/underscore');

var appConfig;

module.exports = function (config) {
    appConfig = config;
    return new FunctionFactory();
}

function FunctionFactory () {
    
    /**
    * The base function that the app uses to handle the request for a given route
    */
    this.getRouteHandler = function (callback) {
        var func = function(req, res) {
            callback(req, res);
        };
        return func;
    };
    
    // Get the component function by type.
    this.getComponentFunction = getComponentFunction;
    
    /**
    * The final function that sends the reponse
    */
    this.getSendResponseHandler = function () {
        var func = function(req, res) {
            res.send(res.getPayload());
        };
        return func;
    };
    
};

//
// Function factory functions
//

/**
* Get a component function by type.
* Converts the component type to a function and eval's it.
* Example: setHeaders > getSetHeadersHandler(component, callback)
*
*/
function getComponentFunction (component, callback) {
    // If component is a string, it's a reference to a globally-defined component.
    if (typeof component === 'string') {
        component = appConfig.globalComponents[component];
    }
    var func = eval(typeToFunctionName(component.type) + '(component, callback)');
    return {func: func, type: component.type};
};

// Specific component functions from here down

function getSetVariableHandler (component, callback) {
    var func = function(req, res) {
        res.setVariable(component.name, evalString(component.value, req, res));
        callback(req, res);
    };
    return func;
};

function getSetHeadersHandler (component, callback) {
    var func = function(req, res) {
        res.set(component.headers);
        callback(req, res);
    };
    return func;
};

function getSetPayloadHandler (component, callback) {
    var func = function(req, res) {
        if (typeof component.value === 'string') {
            res.setPayload(evalString(component.value, req, res));
        } else {
            res.setPayload(component.value);
        }
        callback(req, res);
    };
    return func;
};

function getLoggerHandler (component, callback) {
    var func = function(req, res) {
        console.log(evalString(component.message, req, res));
        callback(req, res);
    };
    return func;
};

function getParseTemplateHandler (component, callback) {
    var encoding = component.encoding || 'utf8';
    var templateCache = {};
    var func = function(req, res) {
        var template = templateCache[component.file];
        if (!template) {
            console.log('Getting ' + component.file + ' template from disk');
            // TODO: Use let with ES6
            var file = fs.readFileSync(component.file, {encoding: encoding});
            template = _.template(file);
            templateCache[component.file] = template;
        }
        var attrs = {};
        for (var key in component.attrs) {
            attrs[key] = evalString(component.attrs[key], req, res);
        }
        var parsed = template(attrs);
        if (component.setPayload) {
            res.setPayload(parsed);
        } else {
            res.setVariable(component.file, parsed);
        }
        callback(req, res);
    };
    return func;
};

// There are some places here where we should use let instead of var in ES6
function getChoiceHandler (component, callback) {
    
    // We first need to build the callback chains for each choice. We'll put them in an array for use in the function below.
    var callbackChains = [];
    for (var i in component.conditions) {
        var condition = component.conditions[i];
        // Note that the passed-in callback will be called after the callback chain is finished.
        callbackChains.push(buildCallbackChain(condition.then, callback));
    }
    
    var func = function(req, res) {
        var condition;
        for (var i in component.conditions) {
            condition = component.conditions[i];
            var result = evalString(condition.if, req, res);
            if (result) {
                var cb = callbackChains[i];
                cb(req, res);
                break;
            }
        }
    };
    return func;
    
};

function getCustomFunctionHandler (component, callback) {
    var func = function(req, res) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(req, res, callback)');
    };
    return func;
};

function getCustomErrorHandlerHandler (component) {
    var func = function(err, req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(err, req, res, next)');
    };
    return func;
};

//
// Utility functions
//

/**
* Convert a type (from the JSON config) to a function name. Example:
* setHeaders > getSetHeadersHandler
*/
function typeToFunctionName (type) {
    return 'get' + type.charAt(0).toUpperCase() + type.substring(1) + 'Handler';
}

/**
* Given an array of components, create the callback chain starting at the end and working back.
* The passed-in function will be called as the last function in the chain.
*
* @param list of components
* @param callback function to call after the last callback in the chain
*/
function buildCallbackChain (components, func) {
    var numComponents = components.length;
    for (var i = numComponents - 1; i >= 0; i--) {
        var component = components[i];
        var obj = getComponentFunction(component, func);
        func = obj.func;
    }
    return func;
}

/**
* Process a string that might contain 'tokens' that need evaluation. Tokens are javascript code/objects surrounded by '$$'.
* For example, in the string:
*
* "You passed in ID: $$req.getParam('id')$$"
*
* req.getParam('id') will get eval'ed and the output included as part of the string. Note that strings can contain multiple tokens.
*/
function evalString (s, req, res) {
    
    var result;
    var array = s.split(/(\$\$)/);
    var token = false;
    
    for (var i in array) {
        var str = array[i];
        if (!str) {
            continue;
        }
        if (str === '$$') {
            token = !token;
            continue;
        }
        if (token) {
            result = (result) ? result + eval(str) : eval(str);
        } else {
            result = (result) ? result + str : str;
        }
    }
    
    return result;
    
}
