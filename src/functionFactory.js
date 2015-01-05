'use strict';

var fs = require('fs');
var _ = require('underscore/underscore');

var getRouteHandler = function (app, route) {
    var func = function(req, res, next) {
        next();
    };
    // Create the route handler using the configured method (get, post, etc). If no method is set, use GET by default.
    route.method = route.method || 'get';
    eval('app.' + route.method.toLowerCase() + '(route.path, func)');
};

var getSetVariableHandler = function (component) {
    var func = function(req, res, next) {
        res.setVariable(component.name, evalString(component.value, req, res));
        next();
    };
    return func;
};

var getSetHeadersHandler = function (component) {
    var func = function(req, res, next) {
        res.set(component.headers);
        next();
    };
    return func;
};

var getSetPayloadHandler = function (component) {
    var func = function(req, res, next) {
        res.setPayload(evalString(component.value, req, res));
        next();
    };
    return func;
};

var getLoggerHandler = function (component) {
    var func = function(req, res, next) {
        console.log(evalString(component.message, req, res));
        next();
    };
    return func;
};

var getParseTemplateHandler = function (component) {
    var encoding = component.encoding || 'utf8';
    var templateCache = {};
    var func = function(req, res, next) {
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
        next();
    };
    return func;
};

var getChoiceHandler = function (component) {
    var func = function(req, res, next) {
        var length = component.conditions.length;
        var condition;
        for (var i = 0; i < length; i++) {
            condition = component.conditions[i];
            var result = evalString(condition.if, req, res);
            if (result) {
                evalString(condition.then, req, res);
                break;
            }
        }
        next();
    };
    return func;
};

var getCustomFunctionHandler = function (component) {
    var func = function(req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(req, res, next)');
        next();
    };
    return func;
};

var getCustomErrorHandlerHandler = function (component) {
    var func = function(err, req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(err, req, res, next)');
    };
    return func;
};

var getSendResponseHandler = function () {
    var func = function(req, res, next) {
        res.send(res.getPayload());
    };
    return func;
};

exports.getRouteHandler = getRouteHandler;
exports.getSetVariableHandler = getSetVariableHandler;
exports.getSetHeadersHandler = getSetHeadersHandler;
exports.getSetPayloadHandler = getSetPayloadHandler;
exports.getLoggerHandler = getLoggerHandler;
exports.getParseTemplateHandler = getParseTemplateHandler;
exports.getChoiceHandler = getChoiceHandler;
exports.getCustomFunctionHandler = getCustomFunctionHandler;
exports.getSendResponseHandler = getSendResponseHandler;
exports.getCustomErrorHandlerHandler = getCustomErrorHandlerHandler;

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
    var length = array.length;
    var token = false;
    
    for (var i = 0; i < length; i++) {
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
