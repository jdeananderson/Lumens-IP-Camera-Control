const express = require('express');
const fs = require("fs");
const path = require("path");
const Cam = require('onvif').Cam;
const axios = require("axios");
const sharp = require("sharp");
const util = require('util')
const sleep = util.promisify(setTimeout);
const _ = require("lodash");

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
    camera.gotoPreset({preset: presetKey}, async function (err, result, xml) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        // pause to let the camera finishing moving
        // todo -- move number to camera object
        await sleep(3500);

        res.send("OK");
    });
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
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let promises = camera.presets
        .map(preset => {
            return fs.promises.access(getPresetImagePath(cameraId, preset.key))
                .then(() => addPresetImageUrl(cameraId, preset))
                .catch(() => addPresetImageUrl(cameraId, preset, true));
    });

    Promise.all(promises).then(results => {
        res.json(results);
    });
});

router.get("/:cameraId/actualPresets", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    camera.getPresets(function(err, presets) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        let presetArray = Object.keys(presets)
                .map(presetName => ({name: presetName, key: presets[presetName]}));

        res.json(presetArray);
    });
});

router.put("/:cameraId/preset/:preset", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let preset = _.find(camera.presets, {key: req.params.preset});
    camera.setPreset({presetName: preset.name, presetToken: preset.key}, function(err) {
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
                       .pipe(fs.createWriteStream(getPresetImagePath(cameraId, preset.key)))
                       .on("finish", () => resolve())
                       .on("error", e => reject(e));
                });
            })
            .then(() => res.json(addPresetImageUrl(cameraId, preset)))
            .catch(err => next(err));
    });
});

router.delete("/:cameraId/preset/:preset", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let preset = _.find(camera.presets, {key: req.params.preset});
    if (preset) {
        camera.removePreset({presetToken: preset.key}, function(err) {
            if (err) {
                console.log(err);
                next(err);
                return;
            }

            const idx = _.findIndex(camera.presets, {key: req.params.preset});
            camera.presets.splice(idx, 1);
            res.json("Deleted preset");
        })
    } else {
        next(new Error(`preset ${req.params.preset} does not exist`));
    }
});

router.get("/:cameraId/snapshot", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];

    axios({url: camera.snapshotUrl, responseType: "stream", auth: {username: camera.username, password: camera.password}})
        .then(response => {
            return new Promise((resolve, reject) => {
                response.data
                    .pipe(res)
                    .on("finish", () => resolve())
                    .on("error", e => reject(e));
            });
        })
        .then(() => res.end())
        .catch(err => next(err));
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

function getPresetImagePath(cameraId, preset) {
    return path.join(process.cwd(), "public", "presets", `${cameraId}-${preset}.png`)
}

function addPresetImageUrl(cameraId, preset, noImage=false) {
    if (noImage) {
        preset.image = "/presets/no-image-icon.png";
    } else {
        let timestamp = Math.floor(new Date() / 1000);
        preset.image = `/presets/${cameraId}-${preset.key}.png?t=${timestamp}`
    }

    return preset;
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

            const setPreset = util.promisify(camera.setPreset.bind(camera));

            camera.getPresets(async function(err, presets) {
                if (err) {
                    console.log(err);
                    return;
                }

                let presetArray = Object.keys(presets)
                    .map(presetName => ({name: presetName, key: presets[presetName]}))
                    .slice(10)
                ;

                console.log(`num of presets: ${presetArray.length}`);

                // todo -- remove extra presets and try code below again
                // todo -- for some reason camera.setPreset() sometimes returns the same token

                // if (presetArray.length < 3) {
                //     for (let i = presetArray.length; i <= 3; i++) {
                //         try {
                //             const presetName = "0" + (i + 10);
                //             console.log(`creating preset ${presetName}`);
                //             const presetResp = await setPreset({presetName: presetName});
                //             console.log(`created preset ${JSON.stringify(presetResp, null, 2)}`)
                //             const presetToken = presetResp[0].setPresetResponse[0].presetToken[0];
                //             presetArray.push({name: presetName, key: presetToken});
                //         } catch (err) {
                //             console.log(err);
                //         }
                //     }
                // }

                camera.presets = presetArray;

                console.log(`camera ${cameraConfig.id} presets: ${JSON.stringify(camera.presets, null, 2)}`);
            });
        });
        camera.snapshotUrl = cameraConfig.snapshotUrl;

        cameras[cameraConfig.id] = camera;
    });

    return router;
};


