const express = require('express');
const fs = require("fs");
const path = require("path");
const Cam = require('onvif').Cam;
const axios = require("axios");
const sharp = require("sharp");
const util = require('util')
const sleep = util.promisify(setTimeout);
const _ = require("lodash");
const formatXML = require('xml-formatter')

const CAMERA_DEBUG = false;

const router = express.Router();
const cameras = {};

const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/
const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/
const linerase = function(xml) {
    if (Array.isArray(xml)) {
        if (xml.length > 1) {
            return xml.map(linerase);
        } else {
            xml = xml[0];
        }
    }
    if (typeof xml === 'object') {
        var obj = {};
        Object.keys(xml).forEach(function(key) {
            obj[key] = linerase(xml[key]);
        });
        return obj;
    } else {
        if (xml === 'true') { return true; }
        if (xml === 'false') { return false; }
        if (numberRE.test(xml)) { return parseFloat(xml); }
        if (dateRE.test(xml)) { return new Date(xml); }
        return xml;
    }
};

// autoFocus = 'AUTO' | 'MANUAL'
Cam.prototype.setAutoFocus = function(autoFocus, callback) {
    let body = this._envelopeHeader() +
        '<SetImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
        '<VideoSourceToken xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
        this.activeSource.sourceToken +
        '</VideoSourceToken>' +
        '<ImagingSettings xmlns="http://www.onvif.org/ver20/imaging/wsdl" >' +
        '<Focus xmlns="http://www.onvif.org/ver10/schema">' +
        '<AutoFocusMode xmlns="http://www.onvif.org/ver10/schema">' + autoFocus + '</AutoFocusMode>' +
        '<DefaultSpeed xmlns="http://www.onvif.org/ver10/schema">1</DefaultSpeed>' +
        '</Focus>' +
        '</ImagingSettings>' +
        '</SetImagingSettings>' +
        this._envelopeFooter();
    this._request({
        service: 'imaging',
        body: body
    }, function(err, data, xml) {
        if (callback) {
            callback.call(this, err, err ? null : linerase(data).setImagingSettingsResponse, xml);
        }
    }.bind(this));
};

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

router.post("/:cameraId/preset", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let presetName = req.body.presetName;
    camera.setPreset({presetName: presetName}, function(err, presetResp) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        const presetToken = presetResp[0].setPresetResponse[0].presetToken[0];
        let preset = {
            name: presetName,
            key: presetToken
        };

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
            .then(() => {
                preset = addPresetImageUrl(cameraId, preset);
                camera.presets.push(preset);
                camera.presets.sort(comparePresets);

                return res.json(preset);
            })
            .catch(err => next(err));
    });
});

router.put("/:cameraId/preset/:preset", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let preset = _.find(camera.presets, {key: req.params.preset});
    if (preset && !preset.locked) {
        camera.setPreset({presetName: preset.name, presetToken: preset.key}, function (err) {
            if (err) {
                console.log(err);
                next(err);
                return;
            }

            const snapshotResizer = sharp().resize(200).png();

            axios({
                url: camera.snapshotUrl,
                responseType: "stream",
                auth: {username: camera.username, password: camera.password}
            })
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
    } else {
        err = (preset) ? new Error(`preset ${req.params.preset} is locked and cannot be modified`) :
            new Error(`preset ${req.params.preset} does not exist`);
        next(err);
    }
});

router.get("/:cameraId/preset/:preset/image", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let preset = _.find(camera.presets, {key: req.params.preset});
    if (preset) {
        saveAndReturnPresetImage(camera, preset, res, next);
    }
})

router.delete("/:cameraId/preset/:preset", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let preset = _.find(camera.presets, {key: req.params.preset});
    if (preset && !preset.locked) {
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
        err = (preset) ? new Error(`preset ${req.params.preset} is locked and cannot be modified`) :
            new Error(`preset ${req.params.preset} does not exist`);
        next(err);
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

router.get("/:cameraId/settings", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    camera.getImagingSettings(function(err, imageSettings) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }
        camera.whiteBalance = {
            mode: imageSettings.whiteBalance.mode,
            red: imageSettings.whiteBalance.crGain,
            blue: imageSettings.whiteBalance.cbGain,
        }
        camera.autoFocus = imageSettings.focus.autoFocusMode;

        res.json({
            whiteBalance: camera.whiteBalance,
            autoFocus: camera.autoFocus,
        });
    });
});

router.get("/:cameraId/settings/:setting", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let setting = req.params.setting;
    camera.getImagingSettings(function(err, imageSettings) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        if (imageSettings.hasOwnProperty(setting)) {
            res.json(imageSettings[setting]);
        } else {
            next(new Error(`${setting} does not exist`));
        }
    });
});

router.put("/:cameraId/settings/:setting/:settingValue", (req, res, next) => {
    let cameraId = req.params.cameraId;
    let camera = cameras[cameraId];
    let setting = req.params.setting;
    let settingValue = req.params.settingValue;

    let callback = function(err, settingsResp) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }
        res.json(settingsResp);
    };

    if (setting === "focus") {
        camera.setAutoFocus(settingValue.toUpperCase(), callback);
    } else {
        let options = {};
        options[setting] = settingValue;
        camera.setImagingSettings(options, callback);
    }
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
    if (!noImage) {
        let timestamp = Math.floor(new Date() / 1000);
        preset.image = `/presets/${cameraId}-${preset.key}.png?t=${timestamp}`
    }

    return preset;
}

function saveAndReturnPresetImage(camera, preset, res, next) {
    const snapshotResizer = sharp().resize(200).png();

    axios({
        url: camera.snapshotUrl,
        responseType: "stream",
        auth: {username: camera.username, password: camera.password}
    })
        .then(response => {
            return new Promise((resolve, reject) => {
                response.data
                    .pipe(snapshotResizer)
                    .pipe(fs.createWriteStream(getPresetImagePath(camera.id, preset.key)))
                    .on("finish", () => resolve())
                    .on("error", e => reject(e));
            });
        })
        .then(() => res.json(addPresetImageUrl(camera.id, preset)))
        .catch(err => next(err));
}

function comparePresets(a, b) {
    return a.key.localeCompare(b.key);
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

            if (CAMERA_DEBUG) {
                camera.addListener('rawRequest', (data) => {
                    console.log('========= rawRequest ============');
                    console.log(formatXML(data));
                    console.log('========= rawRequest end ========');

                });
                camera.addListener('rawResponse', (data) => {
                    console.log('========= rawResponse ============');
                    console.log(data);
                    console.log('========= rawResponse end ========');

                });
            }

            camera.getImagingSettings(function(err, imageSettings) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log(imageSettings);
            });

            camera.getPresets(async function(err, presets) {
                if (err) {
                    console.log(err);
                    return;
                }

                let presetArray = Object.keys(presets)
                    .map(presetName => {
                        let key = "" + presets[presetName];
                        return {
                            name: presetName,
                            key: key,
                            locked: cameraConfig.presetLocks.includes(key)
                        };
                    })
                    .sort(comparePresets);

                console.log(`num of presets: ${presetArray.length}`);

                camera.presets = presetArray;
            });
        });
        camera.snapshotUrl = cameraConfig.snapshotUrl;

        cameras[cameraConfig.id] = camera;
    });
};

exports.router = router;


