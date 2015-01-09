'use strict';

var fs = require('fs');
var _ = require('underscore/underscore');

module.exports = function (appConfig) {
    return new FunctionFactory(appConfig);
}

function FunctionFactory (appConfig) {
    
    /**
    * The base function that the app uses to handle the request for a given route
    */
    this.getRouteHandler = function (callback) {
        var func = function(req, res) {
            callback(req, res);
        };
        return func;
    };
    
    /**
    * Convert the component type to a function and eval it.
    * Example: setHeaders > getSetHeadersHandler(component, callback)
    */
    this.getComponentFunction = function (component, callback) {
        // If component is a string, it's a reference to a globally-defined component.
        if (typeof component === 'string') {
            component = appConfig.globalComponents[component];
        }
        var func = eval(typeToFunctionName(component.type) + '(component, callback)');
        return {func: func, type: component.type};
    };
    
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
        res.setPayload(evalString(component.value, req, res));
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

function getChoiceHandler (component, callback) {
    var func = function(req, res) {
        var condition;
        for (var i in component.conditions) {
            condition = component.conditions[i];
            var result = evalString(condition.if, req, res);
            if (result) {
                evalString(condition.then, req, res);
                break;
            }
        }
        callback(req, res);
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
