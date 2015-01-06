'use strict';

var exec = require('child_process').exec;
var q = require('q');

//
// Data providers
//

var testParams = ['test1','test2','test1','testing'];
var choiceParams = {
    'hello': 'HELLO',
    'hello2': 'HELLO2',
    'hello3': 'Invalid param: hello3'
};

//
// Tests
//

describe("Joule test Suite", function() {
    
    it("tests setHeaders", function(done) {
        getURL('curl -i http://localhost:8081/setHeaders')
        .done(function (response) {
            expect(response.headers.test).toEqual('testing');
            expect(response.headers.test2).toEqual('testing2');
            done();
        });
    });
    
    testParams.forEach(function(element, index, array) {
        it("tests setVariable", function(done) {
            getURL('curl -i http://localhost:8081/setVariable?id=' + element)
            .done(function (response) {
                expect(response.body).toEqual('You passed in id: ' + element);
                done();
            });
        });
    });
    
    it("tests customFunction", function(done) {
        getURL('curl -i http://localhost:8081/customFunction')
        .done(function (response) {
            expect(response.body).toEqual('myVar: this is a test');
            done();
        });
    });
    
    testParams.forEach(function(element, index, array) {
        it("tests parseTemplate with URL param", function(done) {
            getURL('curl -i http://localhost:8081/parseTemplate?id=' + element)
            .done(function (response) {
                expect(response.body).toEqual('This is the ID you passed in: ' + element);
                done();
            });
        });
    });
    
    testParams.forEach(function(element, index, array) {
        it("tests parseTemplate with path param", function(done) {
            getURL('curl -i http://localhost:8081/parseTemplate2/' + element)
            .done(function (response) {
                expect(response.body).toEqual('This is the ID you passed in: ' + element);
                done();
            });
        });
    });
    
    /* TODO: Flesh this out.
    it("tests customErrorHandler", function(done) {
        getURL('curl -i http://localhost:8081/customErrorHandler')
        .then(function (response) {
            expect(response.body).toEqual('This is the ID you passed in: test3');
            done();
        });
    });
    */
    
    for (var property in choiceParams) {
        if (choiceParams.hasOwnProperty(property)) {
            it("tests choiceHandler", function(done) {
                getURL('curl -i http://localhost:8081/choiceHandler?id=' + property)
                .then(function (response) {
                    expect(response.body).toEqual(choiceParams[property]);
                    done();
                });
            });
        }
    }
    
    it("tests 404 Not Found", function(done) {
        getURL('curl -i http://localhost:8081/whatever')
        .then(function (response) {
            expect(response.headers['HTTP/1.1 404 Not Found']).toBeDefined();
            done();
        });
    });
        
});


//
// Util functions
//

/**
* Exec the curl command for the passed-in URL
*/
function getURL (url) {
    var deferred = q.defer();
    exec(cmd, function (err, stdout, stderr) {
        if (err) {
            deferred.reject(err);
        } else {
            var response = parseResponse(stdout);
            deferred.resolve(response);
        }
    });
    return deferred.promise;
}

/**
* Parse the response into headers and body
*/
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
