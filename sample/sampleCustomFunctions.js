module.exports.customFunction = function (req, res, next) {
    console.log('in custom function');
    res.setVariable('myVar', 'this is a test');
}

module.exports.errorHandler = function (err, req, res, next) {
    if (!err) {
        return next();
    }
    console.error("In custom error handler\n" + err.stack);
    res.status(500).send("In custom error handler: " + err.message);
}
