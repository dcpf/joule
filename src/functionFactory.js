'use strict';

var fs = require('fs');
var _ = require('underscore/underscore');

var addRouteHandler = function (app, route) {
    var func = function(req, res, next) {
        next();
    };
    // Add the route handler using the configured method (get, post, etc). If no method is set, use GET by default.
    route.method = route.method || 'get';
    eval('app.' + route.method.toLowerCase() + '(route.path, func)');
};

var addSetVariableHandler = function (app, route, component) {
    var func = function(req, res, next) {
        res.setVariable(component.name, evalString(component.value, req, res));
        next();
    };
    app.use(route.path, func);
};

var addSetHeadersHandler = function (app, route, component) {
    var func = function(req, res, next) {
        res.set(component.headers);
        next();
    };
    app.use(route.path, func);
};

var addSetPayloadHandler = function (app, route, component) {
    var func = function(req, res, next) {
        res.setPayload(evalString(component.value, req, res));
        next();
    };
    app.use(route.path, func);
};

var addLoggerHandler = function (app, route, component) {
    var func = function(req, res, next) {
        console.log(evalString(component.message, req, res));
        next();
    };
    app.use(route.path, func);
};

var addParseTemplateHandler = function (app, route, component) {
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
    app.use(route.path, func);
};

var addChoiceHandler = function (app, route, component) {
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
    app.use(route.path, func);
};

var addCustomFunctionHandler = function (app, route, component) {
    var func = function(req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(req, res, next)');
        next();
    };
    app.use(route.path, func);
};

var addCustomErrorHandlerHandler = function (app, route, component) {
    var func = function(err, req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(err, req, res, next)');
    };
    app.use(route.path, func);
};

var addSendResponseHandler = function (app, route) {
    var func = function(req, res, next) {
        res.send(res.getPayload());
    };
    app.use(route.path, func);
};

exports.addRouteHandler = addRouteHandler;
exports.addSetVariableHandler = addSetVariableHandler;
exports.addSetHeadersHandler = addSetHeadersHandler;
exports.addSetPayloadHandler = addSetPayloadHandler;
exports.addLoggerHandler = addLoggerHandler;
exports.addParseTemplateHandler = addParseTemplateHandler;
exports.addChoiceHandler = addChoiceHandler;
exports.addCustomFunctionHandler = addCustomFunctionHandler;
exports.addSendResponseHandler = addSendResponseHandler;
exports.addCustomErrorHandlerHandler = addCustomErrorHandlerHandler;

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
