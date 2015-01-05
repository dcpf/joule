'use strict';

var exec = require('child_process').exec;
var q = require('q');


var promise = getURL('curl -i http://localhost:8081/hello?id=hello')
.then(function (response) {
    var keys = Object.keys(response.headers);
    keys.forEach(function (element, index, array) {
        console.log(element + ': ' + response.headers[element]);
    });
    console.log(response.body);
}).fail(function (err) {
    console.log('error: ' + error);
});

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

