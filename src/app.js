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

var functionFactory = require('./functionFactory');

var appConfig = initConfig(),
    i = 0, 
    connector,
    app,
    j = 0,
    route,
    k = 0,
    component,
    func;

for (i in appConfig.apps) {
   
    connector = appConfig.apps[i];
    app = createExpressApplication(connector);
    
    for (j in connector.routes) {
        
        route = connector.routes[j];
        functionFactory.getRouteHandler(app, route);
        
        var customErrorHandler = false;
        for (k in route.components) {
            
            component = route.components[k];
            
            // If component is a string, it's a reference to a globally-defined component.
            if (typeof component === 'string') {
                component = getGlobalComponent(component);
            }
            
            // Convert the component type to a function and eval it.
            // Example: setHeaders > functionFactory.getSetHeadersHandler(app, route, component)
            func = eval('functionFactory.' + typeToFunctionName(component.type) + '(component)');
            
            // Attach the function to the app
            app.use(route.path, func);
            
            // If the user has supplied their own error handler, flag it here.
            if (component.type === 'customErrorHandler') {
                customErrorHandler = true;
            }
            
        }
        
        // Finally, attach the send response handler.
        func = functionFactory.getSendResponseHandler();
        app.use(route.path, func);
        
    }
    
    // If no custom error handler has been configured, use a default error handler last to catch, log, and return an appropriate response.
    if (!customErrorHandler) {
        app.use(function(err, req, res, next) {
            if (!err) {
                return next();
            }
            console.error(err.stack);
            res.status(500).send(err.message);
        });
    }
    
}

/**
* Get a globally-defined component
*/
function getGlobalComponent (id) {
    return appConfig.components[id];
}

/**
* Convert a type (from the JSON config) to a function name. Example:
* 
* setHeaders > getSetHeadersHandler
*/
function typeToFunctionName (type) {
    return 'get' + type.charAt(0).toUpperCase() + type.substring(1) + 'Handler';
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
