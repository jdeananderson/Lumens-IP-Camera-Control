const express = require('express');
const router = express.Router();
const onvif = require('onvif');

onvif.Discovery.on('error', function (err,xml) {
    console.log('Discovery error ' + err);
});

router.get("/", (req, res, next) => {
    onvif.Discovery.probe(function(err, cams) {
        // function will be called only after timeout (5 sec by default)
        if (err) {
            // There is a device on the network returning bad discovery data
            // Probe results will be incomplete
            next(err);
        }

        cams.forEach(function (cam) {
            console.log(cam);
        });

        res.send(`${cams.length} cameras found`);
    });
});

module.exports = router;