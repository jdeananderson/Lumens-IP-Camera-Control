const express = require('express');
const fs = require("fs");
const path = require("path");
const Cam = require('onvif').Cam;
const axios = require("axios");
const sharp = require("sharp");

const router = express.Router();
const cameras = {};

router.put("/:cameraId/move/left", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    console.log("sending left move command");
    camera.continuousMove({x: -1, y: 0, zoom: 0}, cameraCallback("left", res, next));
});

router.put("/:cameraId/move/right", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    console.log("sending left move command");
    camera.continuousMove({x: 1, y: 0, zoom: 0}, cameraCallback("right", res, next));
});

router.put("/:cameraId/move/:x-:y", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    let x = req.params.x;
    let y = req.params.y;
    console.log(`sending move command: x=${x}, y=${y}`);
    camera.continuousMove({x: x, y: y, zoom: 0}, cameraCallback("move", res, next));
});

router.put("/:cameraId/move/preset/:preset", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    let presetKey = req.params.preset;
    camera.gotoPreset({preset: presetKey}, cameraCallback("gotoPreset", res, next));
});

router.put("/:cameraId/zoom/:z", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    let zoom = req.params.z;
    console.log(`sending zoom command: z=${zoom}`);
    camera.continuousMove({x: 0, y: 0, zoom: zoom}, cameraCallback("zoom", res, next));
});

router.put("/:cameraId/stop", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    console.log("sending stop command");
    camera.stop({panTilt: true, zoom: true}, cameraCallback("stop", res, next));
});

router.put("/:cameraId/home", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    console.log("sending home command");
    camera.gotoHomePosition({speed: {x: 1, y: 1, zoom: 1}}, cameraCallback("stop", res, next));
});

router.get("/:cameraId/presets", (req, res, next) => {
    let promises = ["001", "002", "003", "004", "005", "006", "007", "008", "009"]
        .map(key => {
            return fs.promises.access(getPresetImagePath(key))
                .then(() => buildPreset(key))
                .catch(() => buildPreset(key, true));
    });

    Promise.all(promises).then(results => {
        res.json(results);
    });
});

router.put("/:cameraId/preset/:preset", (req, res, next) => {
    let camera = cameras[req.params.cameraId];
    let preset = req.params.preset;
    camera.setPreset({presetName: preset, presetToken: preset}, function(err) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        const snapshotResizer = sharp().resize(200).png();

        axios({url: camera.snapshotUrl, responseType: "stream", auth: {username: camera.username, password: camera.password}})
            .then(response => {
                return new Promise((resolve, reject) => {
                   response.data
                       .pipe(snapshotResizer)
                       .pipe(fs.createWriteStream(getPresetImagePath(preset)))
                       .on("finish", () => resolve())
                       .on("error", e => reject(e));
                });
            })
            .then(() => res.json(buildPreset(preset)))
            .catch(err => next(err));
    });
});

function cameraCallback(action, res, next) {
    return function(err) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        console.log(`${action} command sent`);
        res.send("OK");
    }
}

// todo -- add support for multiple cameras
function getPresetImagePath(preset) {
    return path.join(process.cwd(), "public", "presets", `${preset}.png`)
}

function buildPreset(key, noImage=false) {
    return (noImage) ? {key, image: "/presets/no-image-icon.png"} : {key, image: `/presets/${key}.png`};
}

exports.init = function(cameraConfigs) {
    cameraConfigs.forEach(cameraConfig =>{
        let camera = new Cam(cameraConfig, function (err) {
            if (err) {
                console.log('Connection Failed for ' + cameraConfig.hostname + ' Port: ' + cameraConfig.port + ' Username: ' + cameraConfig.username + ' Password: ' + cameraConfig.password);
                console.log(err);
                return;
            }
            console.log(`camera ${cameraConfig.id} at ${cameraConfig.hostname} configured`);
        });
        camera.snapshotUrl = cameraConfig.snapshotUrl;

        cameras[cameraConfig.id] = camera;
    });

    return router;
};


