'use strict';

var exec = require('child_process').exec;
var q = require('q');

//
// Data providers
//

var testParams = ['test1','test2','test1','testing'];
var choiceParams = [
    ['hello', 'HELLO'],
    ['hello2', 'HELLO2'],
    ['hello3', 'Invalid param: hello3']
];

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
    
    it("tests json output", function(done) {
        getURL('curl -i http://localhost:8082/json')
        .done(function (response) {
            expect(response.headers['Content-Type']).toEqual('application/json; charset=utf-8');
            expect(response.body).toEqual('{"1":"test","2":"test2"}');
            done();
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
    
    it("tests customErrorHandler", function(done) {
        getURL('curl -i http://localhost:8081/customErrorHandler')
        .then(function (response) {
            expect(response.headers['HTTP/1.1 500 Internal Server Error']).toBeDefined();
            expect(response.body).toMatch(/^In custom error handler.+/);
            done();
        });
    });
    
    it("tests genericErrorHandler", function(done) {
        getURL('curl -i http://localhost:8081/genericErrorHandler')
        .then(function (response) {
            expect(response.headers['HTTP/1.1 500 Internal Server Error']).toBeDefined();
            expect(response.body).toMatch("ENOENT, no such file or directory 'non-existent-file-to-force-an-error'");
            done();
        });
    });
    
    choiceParams.forEach(function(element, index, array) {
        it("tests choiceHandler", function(done) {
            getURL('curl -i http://localhost:8081/choiceHandler?id=' + element[0])
            .then(function (response) {
                expect(response.body).toEqual(element[1]);
                done();
            });
        });
    });
    
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
function getURL (cmd) {
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
