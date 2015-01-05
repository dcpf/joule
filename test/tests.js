'use strict';

var exec = require('child_process').exec;
var q = require('q');

setHeadersTest();
setVariableTest();
customFunctionTest();
parseTemplateTest();
parseTemplateTest2();
choiceHandlerTest1();
choiceHandlerTest2();
choiceHandlerTest3();

//
// Tests
//

/**
* Tests setHeader functionality
*/
function setHeadersTest () {
    console.log("Running setHeadersTest()");
    getURL('curl -i http://localhost:8081/setHeaders')
    .then(function (response) {
        if (!(response.headers.test === 'testing' &&
              response.headers.test2 === 'testing2')) {
            console.error("Error in setHeadersTest()");
        }
    }).fail(function (err) {
        console.error('Error in setHeadersTest(): ' + error);
    });
}

/**
* Tests setVariable functionality
*/
function setVariableTest () {
    console.log("Running setVariableTest()");
    getURL('curl -i http://localhost:8081/setVariable?id=test1')
    .then(function (response) {
        if (!(response.body === 'You passed in id: test1')) {
            console.error("Error in setVariableTest()");
        }
    }).fail(function (err) {
        console.error('Error in setVariableTest(): ' + error);
    });
}

/**
* Tests using a custom function
*/
function customFunctionTest () {
    console.log("Running customFunctionTest()");
    getURL('curl -i http://localhost:8081/customFunction')
    .then(function (response) {
        if (!(response.body === 'myVar: this is a test')) {
            console.error("Error in customFunctionTest()");
        }
    }).fail(function (err) {
        console.error('Error in customFunctionTest(): ' + error);
    });
}

/**
* Tests parsing a template passing URL param
*/
function parseTemplateTest () {
    console.log("Running parseTemplateTest()");
    getURL('curl -i http://localhost:8081/parseTemplate?id=test2')
    .then(function (response) {
        if (!(response.body === 'This is the ID you passed in: test2')) {
            console.error("Error in parseTemplateTest()");
        }
    }).fail(function (err) {
        console.error('Error in parseTemplateTest(): ' + error);
    });
}

/**
* Tests parsing a template passing path param
*/
function parseTemplateTest2 () {
    console.log("Running parseTemplateTest2()");
    getURL('curl -i http://localhost:8081/parseTemplate2/test3')
    .then(function (response) {
        if (!(response.body === 'This is the ID you passed in: test3')) {
            console.error("Error in parseTemplateTest2()");
        }
    }).fail(function (err) {
        console.error('Error in parseTemplateTest2(): ' + error);
    });
}

/**
* Tests using a custom error handler.
* TODO: Flesh this out.
*/
function customErrorHandlerTest () {
    console.log("Running customErrorHandlerTest()");
    getURL('curl -i http://localhost:8081/customErrorHandler')
    .then(function (response) {
        if (!(response.body === 'This is the ID you passed in: test3')) {
            console.error("Error in customErrorHandlerTest()");
        }
    }).fail(function (err) {
        console.error('Error in customErrorHandlerTest(): ' + error);
    });
}

/**
* Tests choiceHandler
*/
function choiceHandlerTest1 () {
    console.log("Running choiceHandlerTest1()");
    getURL('curl -i http://localhost:8081/choiceHandler?id=hello')
    .then(function (response) {
        if (!(response.body === 'Response: HELLO')) {
            console.error("Error in choiceHandlerTest1()");
        }
    }).fail(function (err) {
        console.error('Error in choiceHandlerTest1(): ' + error);
    });
}

/**
* Tests choiceHandler
*/
function choiceHandlerTest2 () {
    console.log("Running choiceHandlerTest2()");
    getURL('curl -i http://localhost:8081/choiceHandler?id=hello2')
    .then(function (response) {
        if (!(response.body === 'Response: HELLO2')) {
            console.error("Error in choiceHandlerTest2()");
        }
    }).fail(function (err) {
        console.error('Error in choiceHandlerTest2(): ' + error);
    });
}

/**
* Tests choiceHandler
*/
function choiceHandlerTest3 () {
    console.log("Running choiceHandlerTest3()");
    getURL('curl -i http://localhost:8081/choiceHandler?id=hello3')
    .then(function (response) {
        if (!(response.body === 'Response: Invalid param: hello3')) {
            console.error("Error in choiceHandlerTest3()");
        }
    }).fail(function (err) {
        console.error('Error in choiceHandlerTest3(): ' + error);
    });
}


//
// Util functions
//

function getURL (url) {
    var deferred = q.defer();
    exec(url, function (err, stdout, stderr) {
        if (err) {
            deferred.reject(err);
        } else {
            var response = parseResponse(stdout);
            deferred.resolve(response);
        }
    });
    return deferred.promise;
}

function parseResponse (stdout) {
    
    var response = {
        headers: {},
        body: ''
    };
    
    var array = stdout.split('\n'),
        inHeaders = true,
        i,
        key,
        value;
    
    array.forEach(function (element, index, array) {
        
        element = element.trim();
        if (!element) {
            // The first empty new-line encountered signifies the headers section is done and the body begins
            inHeaders = false;
            return;
        }
        
        if (inHeaders) {
            i = element.indexOf(':');
            if (i === -1) {
                key = element;
                value = '1';
            } else {
                key = element.substring(0, i);
                value = element.substr(i + 1).trim();
            }
            response.headers[key] = value;
        } else {
            response.body += element;
        }
    });
    
    return response;
    
}

