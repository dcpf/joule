# Joule

Inspired by Mule (http://www.mulesoft.com), Joule is a collection of built-in configurable components that help you get your REST service up and running quickly! These components include common things like setting headers and variables, logging, file parsing, consuming external web services, etc. Joule also takes care of all of the scaffolding and setup required for a REST service, letting you concentrate on your own code, configured as custom components. Read on to see how easy it is to create a REST service with Joule.

## Table of Contents
* [Configuration](#configuration)
	* [Routes](#routes)
	* [Components](#components)
		* [SetHeaders](#setheaders)
        * [SetVariable](#setvariable)
        * [Logger](#logger)
        * [ParseTemplate](#parsetemplate)
        * [WebServiceConsumer](#webserviceconsumer)
        * [Choice](#choice)
        * [CustomFunction](#customfunction)
        * [SetPayload](#setpayload)
        * [CustomErrorHandler](#customerrorhandler)
    * [GlobalComponents](#globalcomponents)
* [Enhancements to request and response objects](#enhancements-to-request-and-response-objects)
    * [req.getParam()](#reqgetparam)
    * [req.getParams()](#reqgetparams)
    * [res.setVariable()](#ressetvariable)
    * [res.getVariable()](#resgetvariable)
    * [res.setPayload()](#ressetpayload)
    * [res.getPayload()](#resgetpayload)
    * [res.setError()](#resseterror)

## Configuration

A Joule app is configured via a JSON config file where you define your app, it's routes, and the component flow for each route. A simple example of this is:

```
{
    "apps": [
        {
            "host": "localhost",
            "port": 8081,
            "routes": [
                {
                    "path": "/hello",
                    "components": [
                        {
                            "type": "setPayload",
                            "value": "Hello World!"
                        }
                    ]
                }
            ]
        },
        {
            "host": "localhost",
            "port": 8082,
            "routes": [
                {
                    "path": "/hello",
                    "components": [
                        {
                            "type": "setPayload",
                            "value": {
                                "Hello": "World!",
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```

Here we have defined two apps, one running on port 8081, and one running on 8082. Each app has a /hello route defined.

Hitting http://localhost:8081/hello will respond with the plain text string:

`Hello World!`

Hitting http://localhost:8082/hello will respond with a json object:

`{"Hello": "World!"}`

### Routes

Joule sits on top of ExpressJS, so routing configuration follows ExpressJS conventions. I.e, any route supported by ExpressJS is also supported by Joule.

That's really it for the app and route configuration. Let's dive into the components!

## Components 

#### SetHeaders
Sets the headers on the response. Example:

```
{
    "type": "setHeaders",
    "headers": {
        "header1": "whatever",
        "header2": "some value"
    }
}
```

#### SetVariable
Sets a variable within the scope of the request/response flow. You can use these variables in your own custom code or in other components using res.getVariable(varName). Examples:

Set the airline variable to "delta":

```
{
    "type": "setVariable",
    "name": "airline",
    "value": "delta"
}
```

The value attribute can also take javascript code that will be evaluated. Just surround the code with $$ tokens:

```
{
    "type": "setVariable",
    "name": "passedInId",
    "value": "$$req.getParam('id')$$"
}
```

#### Logger
Lets you add logging at any point in the flow. Examples:

```
{
    "type": "logger",
    "message": "Looking up user ..."
}
```

The message attribute can also take javascript code that will be evaluated. Just surround the code with $$ tokens:

```
{
    "type": "logger",
    "message": "ID: $$res.getVariable('id')$$"
}
```

#### ParseTemplate
Parses a file using underscore's built-in template engine. Examples:

This parses the templates/products.html file passing in optional attributes for token replacement. Setting setPayload to true causes the parsed output to be sent as the response body:

```
{
    "type": "parseTemplate",
    "file": "templates/products.html",
    "attrs": {
        "title": "Our Products",
        "id": "$$req.getParam('id')$$"
    },
    "setPayload": true
}
```

Same as above but stores the parsed output in a variable called productsHtml:

```
{
    "type": "parseTemplate",
    "file": "templates/products.html",
    "attrs": {
        "title": "Our Products",
        "id": "$$req.getParam('id')$$"
    },
    "varName": "productsHtml"
}
```

#### WebServiceConsumer
Calls a web service. Examples:

Make a get request to an endPoint, expecting the response type to be JSON. Setting setPayload to true causes the parsed output to be sent as the response body:

```
{
    "type": "webServiceConsumer",
    "method": "get", // Optional. If not supplied, 'get' will be used by default.
    "endPoint": "http://api.data.gov/census/american-community-survey/v1/2011/populations/states?api_key=DEMO_KEY",
    "responseType": "json",
    "setPayload": true
}
```

Same as above but stores the parsed output in a variable called statePolpulations:

```
{
    "type": "webServiceConsumer",
    "endPoint": "http://api.data.gov/census/american-community-survey/v1/2011/populations/states?api_key=DEMO_KEY",
    "responseType": "json",
    "varName": "statePolpulations"
}
```

#### Choice
The choice component lets you dynamically decide what to do based on the outcome of the conditions you define. Each condition contains an 'if' attribute with your logic (surrouned by $$ tokens as seen above). The 'then' attribute can contain one or more components to call based on the outcome of the 'if' logic. If a condition's logic evaluates to true, the components defined in the 'then' attribute will be called, in order. All other conditions will be ignored. A final condition with '$$true$$' for the 'if' attribute acts as the default condition to perform if no others evaluated to true.

```
{
    "type": "choice",
    "conditions": [
        {
            "if": "$$req.getParam('airline') === 'delta'$$",
            "then": [
                {
                    "type": "logger",
                    "message": "Calling delta web svc ..."
                },
                {
                    "type": "webServiceConsumer",
                    "endPoint": "http://www.delta.com/api/flights",
                    "responseType": "json",
                    "varName": "flights"
                }
            ]
        },
        {
            "if": "$$req.getParam('airline') === 'jetblue'$$",
            "then": [
                {
                    "type": "logger",
                    "message": "Calling jetblue web svc ..."
                },
                {
                    "type": "webServiceConsumer",
                    "endPoint": "http://www.jetblue.com/apis/flights",
                    "responseType": "json",
                    "varName": "flights"
                }
            ]
        },
        {
            "if": "$$true$$",
            "then": [
                {
                    "type": "setPayload",
                    "value": "Missing required parameter: airline"
                }
            ]
        }
    ]
}
```

#### CustomFunction
Allows you to call your own custom function. Example:

```
{
    "type": "customFunction",
    "require": "app/customFunctions", // The relative file where the custom function lives
    "function": "myCustomFunction" // The function name
}
```

When writing a custom function, it must accept three arguments:

* req - The request
* res - The response
* callback - The next component to call

Joule takes care of passing these arguments in to each component/function. Also, make sure to call the next callback when your function is done. Example:

```
module.exports.myCustomFunction = function (req, res, callback) {
    // Use setTimeout to prove that async function calls work within the framework
    setTimeout(function(){
        console.log('in custom function');
        res.setVariable('myVar', 'this is a test');
        callback(req, res);
    }, 1000);
}
```

Also, when writing a custom function, it's crucial to detect and handle errors properly. Joule provides a res.setError() function that can aid with this. In your code, if you detect an error, calling this function will result in the error handler being invoked. In this example, if fs.readFileSync() throws an error, calling res.setError(e) followed by a return will bypass all remaining components in the flow and invoke the error handler:

```
try {
    var file = fs.readFileSync(component.file, {encoding: encoding});
} catch (e) {
    res.setError(e);
    return;
}
```

#### SetPayload
Sets the response body to return to the client. This typically comes at the end of a route's flow. Examples:

Set a plain text response body (the Content-Type header will automatically be set to text/plain):

```
{
    "type": "setPayload",
    "value": "You passed in id: $$res.getVariable('passedInId')$$"
}
```

Set a JSON object as the response body (the Content-Type header will automatically be set to application/json):

```
{
    "type": "setPayload",
    "value": {
        "1": "test",
        "2": "test2"
    }
}
```

#### CustomErrorHandler
By default, Joule handles errors by logging the stack trace and sending a 500 Internal Server Error back to the caller along with the error message. If you need your own behaviour, you can specify a custom error handler like so:

```
{
    "type": "customErrorHandler",
    "require": "app/customFunctions", // The relative file where the custom error handler lives
    "function": "myErrorHandler" // The error handler function name
}
```

When writing a custom error handler function, it must accept three arguments:

* req - The request
* res - The response
* err - The error object

Example:

```
module.exports.myErrorHandler = function (req, res, err) {
    console.error("In custom error handler\n" + err.stack);
    res.status(500).send("In custom error handler: " + err.message);
}
```

## GlobalComponents

You may find the need to configure the same type of component(s) with the same attribute(s) over and over again (e.g., a setHeader component for setting no-cache headers). To aid with this, Joule supports the notion of global components. Simply define these components in the globalComponents namespace, and you can then reference them elsewhere in the configuration. In this example, we define two global components with the names/IDs setNoCacheHeaders and setHeadersLogger:

```
"globalComponents": {
    "setNoCacheHeaders": {
        "type": "setHeaders",
        "headers": {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    },
    "headersLogger": {
        "type": "logger",
        "message": "Headers: $$JSON.stringify(res._headers)$$"
    }
}
```

We can then reference these in a component flow like so:

```
{
    "path": "/hello",
    "components": [
        "setNoCacheHeaders",
        "headersLogger",
        {
            "type": "setPayload",
            "value": "Hello World!"
        }
    ]
}
```

As you can see, we first set the no-cache headers, then the headers logger, and finally, we set the payload.

## Enhancements to request and response objects

Joule modifies the request and response objects with the following handy functions:

#### req.getParam(name)
Gets the value of a request parameter by name. This can be a parameter passed in as:

* Query param: http://myhost.com/users?userid=1234
* Path param: http://myhost.com/hello/:userid
* POST param: {userid: 1234} (passed as the POST data in the body of the request)

#### req.getParams()
Returns a hash of all request parameters.

#### res.setVariable(name, value)
Set a variable for later use in your app.

#### res.getVariable(name)
Get a variable set with res.setVariable().

#### res.setPayload(payload)
Set the payload of the response.

#### res.getPayload()
Get the payload set with res.setPayload().

#### res.setError(err)
When an error occurs in a custom component, calling this function will invoke the error handler. Note that you must also explicitely return after calling this function:

```
res.setError(err);
return;
```