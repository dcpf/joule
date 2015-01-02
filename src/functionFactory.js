var addRouteHandler = function (app, route) {
    var func = function(req, res, next) {
        next();
    };
    // Add the route handler using the configured method (get, post, etc). If no method is set, use GET by default.
    route.method = route.method || 'get';
    eval('app.' + route.method.toLowerCase() + '(route.path, func)');
}

var addSetHeadersHandler = function (app, route, component) {
    var func = function(req, res, next) {
        res.set(component.headers);
        next();
    };
    app.use(route.path, func);
}

var addSetPayloadHandler = function (app, route, component) {
    var func = function(req, res, next) {
        res.locals._joule.payload = evalString(component.value, req, res);
        next();
    };
    app.use(route.path, func);
}

var addLoggerHandler = function (app, route, component) {
    var func = function(req, res, next) {
        console.log(evalString(component.message, req, res));
        next();
    };
    app.use(route.path, func);
}

var addCustomFunctionHandler = function (app, route, component) {
    var func = function(req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(req, res, next)');
        next();
    };
    app.use(route.path, func);
}

var addCustomErrorHandlerHandler = function (app, route, component) {
    var func = function(err, req, res, next) {
        var obj = require(component.require);
        eval('obj.' + component.function + '(err, req, res, next)');
    };
    app.use(route.path, func);
}

var addSendResponseHandler = function (app, route) {
    var func = function(req, res, next) {
        res.send(res.locals._joule.payload);
    };
    app.use(route.path, func);
}

exports.addRouteHandler = addRouteHandler;
exports.addSetHeadersHandler = addSetHeadersHandler;
exports.addSetPayloadHandler = addSetPayloadHandler;
exports.addLoggerHandler = addLoggerHandler;
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
    var result = '';
    var array = s.split(/(\$\$)/);
    var length = array.length;
    var token = false;
    for (var i = 0; i < length; i++) {
        var str = array[i];
        if (str === '$$') {
            token = !token;
            continue;
        }
        if (token) {
            result += eval(array[i]);
        } else {
            result += array[i];
        }
    }
    return result;
}
