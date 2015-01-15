module.exports.customFunction = function (req, res, callback) {
    // Use setTimeout to prove that async function calls work within the framework
    setTimeout(function(){
        console.log('in custom function');
        res.setVariable('myVar', 'this is a test');
        callback(req, res);
    }, 1000);
}

module.exports.errorHandler = function (req, res, err) {
    console.error("In custom error handler\n" + err.stack);
    res.status(500).send("In custom error handler: " + err.message);
}
