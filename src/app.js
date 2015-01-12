'use strict';

var fs = require('fs');
var path = require('path');
var events = require('events');

// express and middleware
var express = require('express');
//var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var errorHandler = require('errorhandler');

var appConfig = initConfig();
var functionFactory = require('./functionFactory')(appConfig);

var i = 0,
    j = 0,
    k = 0;

for (i in appConfig.apps) {
    
    // NOTE: We should use let in these for-loops instead of var with ES6
    var connector = appConfig.apps[i];
    var app = createExpressApplication(connector);
    
    for (j in connector.routes) {
        
        var route = connector.routes[j];
        var customErrorHandler = null;
        
        // We work backwards through the components so we're able to tell each function which callback to call next.
        // So we start with the sendResponse handler, which is the last function in the chain.
        var func = functionFactory.getSendResponseHandler();
        
        // Loop backwards through the components, building the callback chain.
        var numComponents = route.components.length;
        for (k = numComponents - 1; k >= 0; k--) {
            
            var component = route.components[k];
            var obj = functionFactory.getComponentFunction(component, func);
            
            // If the user has supplied their own error handler, store it here. Else, set func to the returned function.
            if (obj.type === 'customErrorHandler') {
                customErrorHandler = obj.func;
            } else {
                func = obj.func;
            }
            
        }
        
        // Now that we've built the callback chain, get the route handler, and attach it to the app.
        var routeHandler = functionFactory.getRouteHandler(func);
        route.method = route.method || 'get';
        eval('app.' + route.method.toLowerCase() + '(route.path, routeHandler)');
        console.log('Registered route: ' + route.path);
        
        // If a custom error handler has been configured, 'use' it. Else, use a generic error handler.
        if (customErrorHandler) {
            app.use(route.path, customErrorHandler);
        } else {
            app.use(route.path, function(err, req, res, next) {
                console.error(err.stack);
                res.status(500).send(err.message);
            });
        }
        
    }
    
}

function initConfig () {
    var configFile = process.argv[2] || 'app-config.json';
    var config = {};
    try {
        console.log('Loading config file: ' + configFile);
        config = JSON.parse(fs.readFileSync(configFile, {encoding: 'utf8'}));
    } catch (err) {
        console.error('No config file found at: ' + configFile);
    }
    return config;
}


/**
* Create the app and start the listener
*/
function createExpressApplication (connector) {
    
    console.log('Starting app on ' + connector.host + ':' + connector.port);
    var app = express();
    app.set('host', connector.host);
    app.set('port', connector.port);
    app.set('eventEmitter', new events.EventEmitter());
            
    app.use(compression());
    //app.use(morgan());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(methodOverride());
    app.use(cookieParser());

    app.disable('x-powered-by');

    // set up some things we need for the app
    app.use(enhanceRequest);
    app.use(requestLogger);

    app.listen(connector.port, function() {
        console.log('App listening on ' + connector.host + ':' + connector.port);
    });
    
    return app;
}

/*
* Enhance the request and response objects with a few things.
*/      
function enhanceRequest (req, res, next) {
    
    // Create a space for joule-specific stuff
    res.locals._joule = {};
    res.locals._joule.vars = {};
    
    res.setVariable = function (name, value) {
        res.locals._joule.vars[name] = value;
    };
    
    res.getVariable = function (name) {
        return res.locals._joule.vars[name];
    };
    
    res.setPayload = function (payload) {
        res.locals._joule.payload = payload;
    };
    
    res.getPayload = function () {
        return res.locals._joule.payload;
    };

    // Get the passed-in params (for either GET, POST or route params), and make them available via req.getParam() and req.getParams()
    var params = {};
    if (req.method === 'POST') {
        params = req.body;
    } else if (req.method === 'GET') {
        params = req.query;
    }
    req.getParam = function (name) {
        return params[name] || req.params[name];
    };
    req.getParams = function () {
        // add everything from req.params to params
        for (var name in req.params) {
            if (!params[name]) {
                params[name] = req.params[name];
            }
        }
        return params;
    };
    
    next();
    
}

/*
* Log start and end of all requests
*/
function requestLogger (req, res, next) {
    var start = new Date();
    console.log(req.method + ' ' + req.url + '; IP: ' + req.connection.remoteAddress + '; User-agent: ' + req.headers['user-agent']);
    res.on('finish', function () {
        var duration = new Date() - start;
        console.log(req.method + ' ' + req.url + '; IP: ' + req.connection.remoteAddress + '; Execution time: ' + duration + ' ms');
    });
    next();
}
