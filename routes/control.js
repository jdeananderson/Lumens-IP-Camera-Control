const express = require('express');
const Cam = require('onvif').Cam;
const router = express.Router();

const cameras = {};

router.put("/:cameraId/move/left", function (req, res) {
    let camera = cameras[req.params.cameraId];
    console.log("sending left move command");
    camera.continuousMove({x: -1, y: 0, zoom: 0}, cameraCallback("left", res));
});

router.put("/:cameraId/move/right", function (req, res) {
    let camera = cameras[req.params.cameraId];
    console.log("sending left move command");
    camera.continuousMove({x: 1, y: 0, zoom: 0}, cameraCallback("right", res));
});

router.put("/:cameraId/move/:x-:y", function(req, res) {
    let camera = cameras[req.params.cameraId];
    let x = req.params.x;
    let y = req.params.y;
    console.log(`sending move command: x=${x}, y=${y}`);
    camera.continuousMove({x: x, y: y, zoom: 0}, cameraCallback("move", res));
});

router.put("/:cameraId/zoom/:z", (req, res) => {
    let camera = cameras[req.params.cameraId];
    let zoom = req.params.z;
    console.log(`sending zoom command: z=${zoom}`);
    camera.continuousMove({x: 0, y: 0, zoom: zoom}, cameraCallback("zoom", res));
});

router.put("/:cameraId/stop", function (req, res) {
    let camera = cameras[req.params.cameraId];
    console.log("sending stop command");
    camera.stop({panTilt: true, zoom: true}, cameraCallback("stop", res));
});

router.put("/:cameraId/home", function (req, res) {
    let camera = cameras[req.params.cameraId];
    console.log("sending home command");
    camera.gotoHomePosition({speed: {x: 1, y: 1, zoom: 1}}, cameraCallback("stop", res));
});

function cameraCallback(action, res) {
    return function(err) {
        if (err) {
            console.log(err);
        }

        console.log(`${action} command sent`);
        res.send("OK");
    }
}

exports.init = function(cameraConfigs) {
    cameraConfigs.forEach(cameraConfig =>{
        cameras[cameraConfig.id] = new Cam(cameraConfig, function (err) {
            if (err) {
                console.log('Connection Failed for ' + cameraConfig.hostname + ' Port: ' + cameraConfig.port + ' Username: ' + cameraConfig.username + ' Password: ' + cameraConfig.password);
                console.log(err);
                return;
            }
            console.log(`camera ${cameraConfig.id} at ${cameraConfig.hostname} configured`);
        });
    });

    return router;
};


