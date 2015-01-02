module.exports.customFunction = function (req, res, next) {
    console.log('in custom function');
    res.locals.myVar = 'this is a test';
}

module.exports.errorHandler = function (err, req, res, next) {
    if (!err) {
        return next();
    }
    console.error("In custom error handler\n" + err.stack);
    res.status(500).send(err.message);
}
