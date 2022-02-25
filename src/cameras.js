import "./css/cameras.scss";

import {debounce, forEach, reduce, throttle} from "lodash-es";

import * as gpLib from "./lib/gamepad";
import {deadzone} from "./lib/gamepad";
import {clampJoystick} from "./lib/gamepad";
import * as camera from "./lib/camera";
let template = require("./views/message.pug");
let gamepadButton = require("./views/gamepad-button.pug");
let presetsTemplate = require("./views/presets.pug");
let cameraDataTemplate = require("./views/cameraData.pug");

app.snapshot = {
    timeoutPeriod: 5,
    img: new Image(),
};

app.server = "http://localhost:4000";

let gamepadIdxs = [];

let foundGamepad = false;
let currentX = 0;
let currentY = 0;
let currentZ = 0;

let cameraMoving = false;

function init() {
    let canvas = document.getElementById("imgCanvas");
    let context = canvas.getContext("2d");
    let containerStyle = getComputedStyle(document.getElementById("videoContainer"));
    let widthpx = containerStyle.width;
    let heightpx = containerStyle.height;
    let width = widthpx.replace("px", "");
    let height = heightpx.replace("px", "");
    app.snapshot.img.onload = function() {
        canvas.setAttribute("width", widthpx);
        canvas.setAttribute("height", heightpx);
        context.drawImage(app.snapshot.img, 0, 0, width, height);
        setTimeout(updateSnapshot, app.snapshot.timeoutPeriod);
    }
    updateSnapshot();
    configureArrowButtons();
    buildPresets();
    updateCameraData();

    if (gpLib.hasGamepadSupport()) {
        updateGamepads();
        window.requestAnimationFrame(gameloop);
    } else {
        console.log("gamepads not supported")
    }

    camera.addOnMoveHandler(removePresetSelection);
}

async function gameloop() {
    if (gpLib.numGamepadsChanged() !== 0) {
        updateGamepads();
    }

    if (gamepadIdxs.length > 0) {
        // todo -- remove hard-coded index to support multiple controllers
        let gamepad = gpLib.getGamepad(gamepadIdxs[0]);
        if (gamepad) {
            if (!foundGamepad) {
                console.log(gamepad.id);
                foundGamepad = true;
            }

            forEach(gamepad.buttons, async (button, idx) => {
                if (button.pressed) {
                    console.log(`button ${idx} pressed`);
                    switch (idx) {
                        // A
                        case 0:
                            gotoPreset();
                            break;
                        // Y
                        case 3:
                            updatePresetImage();
                            break;
                        // R
                        case 5:
                            replacePreset();
                            break;
                        // ZL
                        case 6:
                            selectPreviousCamera();
                            break;
                        // ZR
                        case 7:
                            selectNextCamera();
                            break;
                        // D-Pad
                        case 12:
                            updatePresetFocus("up");
                            break;
                        case 13:
                            updatePresetFocus("down");
                            break;
                        case 14:
                            updatePresetFocus("left");
                            break;
                        case 15:
                            updatePresetFocus("right");
                            break;
                        // home button
                        case 16:
                            await camera.cameraHome();
                            break;
                    }
                }
            });

            // left joystick
            let x = deadzone(gamepad.axes[0]);
            let y = deadzone(gamepad.axes[1]);
            [x, y] = clampJoystick(x, y);

            let roundX = Math.round((x + Number.EPSILON) * 100) / 100;
            let roundY = Math.round((y + Number.EPSILON) * 100) / 100;

            if (currentX !== roundX || currentY !== roundY) {

                currentX = roundX;
                currentY = roundY;

                if (x === 0 && y === 0) {
                    await camera.cameraStop();
                } else {
                    await camera.cameraMove(x, -y);
                }
            }

            // right joystick
            let z = deadzone(gamepad.axes[3]);
            let roundZ = Math.round((z + Number.EPSILON) * 100) / 100;
            if (currentZ !== roundZ) {

                currentZ = roundZ;

                if (z === 0) {
                    await camera.cameraStop();
                } else {
                    await camera.cameraZoom(-z);
                }
            }
        }
    } else {
        foundGamepad = false;
    }

    requestAnimationFrame(gameloop);
}

function updateGamepads() {
    gamepadIdxs = [];
    let gamepads = navigator.getGamepads();
    console.log(`Num of gamepads: ${gamepads.length}`);

    let gamepadsDiv = document.getElementById("gamepads");
    gamepadsDiv.innerHTML = "";
    let active = reduce(gamepads, (count, gamepad) => {
        if (gamepad && gamepad.connected) {
            if (gamepad.mapping === "standard") {
                count += 1;
                let html = gamepadButton({gamepad: gamepad});
                let template = document.createElement("template");
                template.innerHTML = html.trim();
                gamepadsDiv.appendChild(template.content.firstChild);
                gamepadIdxs.push(gamepad.index);
            } else {
                console.log(`${gamepad.id} does not use standard mapping!`);
            }
        }
        return count;
    }, 0);

    if (active === 0) {
        gamepadsDiv.innerHTML = template({message: "Attach a gamepad or press a gamepad button"});
    } else {
        let gamepadHelp = document.getElementById("gamepad-help");
        if (gamepadHelp) {
            gamepadHelp.style.display = "block";
        }
    }
}

function updateSnapshot() {
    app.snapshot.img.src = `/control/${app.cameraId}/snapshot?t=${Date.now()}`;
    // app.snapshot.img.src = `${app.snapshotUrl}?t=${Date.now()}`;
}

function configureArrowButtons() {
    let buttons = [
        {id: "cameraLeftUp", x: -1, y: 1},
        {id: "cameraUp", x: 0, y: 1},
        {id: "cameraRightUp", x: 1, y: 1},
        {id: "cameraLeft", x: -1, y: 0},
        {id: "cameraRight", x: 1, y: 0},
        {id: "cameraLeftDown", x: -1, y: -1},
        {id: "cameraDown", x: 0, y: -1},
        {id: "cameraRightDown", x: 1, y: -1},
    ];

    buttons.forEach(button => {
        let element = document.getElementById(button.id);
        element.onmousedown = function (event) {
            camera.cameraMove(button.x, button.y);
        };
        element.onmouseup = camera.cameraStop;
    });

    let homeButton = document.getElementById("cameraHome");
    homeButton.onclick = function (event) {
        camera.cameraHome();
    };

    let zoomOutButton = document.getElementById("zoomOut");
    zoomOutButton.onmousedown = function(event) {
        camera.cameraZoom(-0.5);
    }
    zoomOutButton.onmouseup = camera.cameraStop;

    let zoomInButton = document.getElementById("zoomIn");
    zoomInButton.onmousedown = function(event) {
        camera.cameraZoom(0.5);
    }
    zoomInButton.onmouseup = camera.cameraStop;
}

function updateCameraData() {
    camera.getWhiteBalance()
        .then(results => {
            console.log(results.data);
            let cameraDataDiv = document.getElementById("cameraData");
            cameraDataDiv.innerHTML = cameraDataTemplate({whiteBalance: results.data});

            let updateButton = document.getElementById("updateWhiteBalance");
            updateButton.onclick = function(event) {
                updateCameraData();
            }
        })
        .catch( err => console.error(err));
}

function buildPresets() {
    camera.getPresets().then(results => {
        let presetsDiv = document.getElementById("presets");
        presetsDiv.innerHTML = presetsTemplate({presets: results.data});

        // todo -- prevent other clicks until gotoPreset returns
        forEach(document.getElementsByClassName("preset"), preset => {
            preset.onclick = function(event) {
                event.stopPropagation();
                gotoPreset(preset);
            }
        });

        forEach(document.getElementsByClassName("preset-replace"), replaceButton => {
            replaceButton.onclick = function(event) {
                event.stopPropagation();
                replacePreset(replaceButton.parentElement);
            }
        })

        let addPresetDiv = document.getElementById("preset-add");
        if (addPresetDiv) {
            addPresetDiv.onclick = function(event) {
                event.stopPropagation();
                addPreset(addPresetDiv);
            }
        }
    });

    // let updateAllButton = document.getElementById("updatePresetsButton");
    // updateAllButton.onclick = async function (event) {
    //     if (cameraMoving) {
    //         return
    //     }
    //
    //     removePresetSelection();
    //
    //     let presets = document.getElementsByClassName("preset");
    //     for (let i = 0; i < presets.length; i++) {
    //         let preset = presets[i];
    //         console.log(`moving to preset ${preset.dataset.presetId}`);
    //         await camera.gotoPreset(preset.dataset.presetId);
    //         console.log(`updating picture on preset ${preset.dataset.presetId}`);
    //         let resp = await camera.setPreset(preset.dataset.presetId);
    //         if (resp.data && resp.data.image) {
    //             preset.style.setProperty("background-image", `url("${resp.data.image}")`);
    //         }
    //     }
    // }
}

const updatePresetFocus = debounce(
    function (direction) {
        let presets = document.getElementsByClassName("preset");
        let current, next;
        for (let i = 0; i < presets.length; i++) {
            if (presets[i].classList.contains("focus")) {
                current = presets[i];
                let j = 0;
                // up and down calculations assume a row of presets is 3 wide
                switch (direction) {
                    case "right":
                        j = (i+1 >= presets.length) ? 0: i+1;
                        break;
                    case "left":
                        j = (i-1 < 0) ? presets.length - 1: i-1;
                        break;
                    case "up":
                        j = i - 3;
                        if (j < 0) {
                            j += presets.length;
                        }
                        break;
                    case "down":
                        j = i + 3;
                        if (j >= presets.length) {
                            j -= presets.length;
                        }
                        break;
                }
                next = presets[j];
                break;
            }
        }

        if (current) {
            current.classList.remove("focus");
        }

        if (!next) {
            next = presets[0];
        }

        next.classList.add("focus");
    },
    100, {leading: true, trailing: false}
);

const gotoPreset = debounce(
    function(preset) {
        if (cameraMoving) {
            return;
        }

        if (!preset) {
            let presetElements = document.getElementsByClassName("preset focus");
            if (presetElements.length > 0) {
                preset = presetElements[0];
            }
        }

        if (preset) {
            cameraMoving = true;
            let presetOverlay = preset.parentElement.querySelector(".preset-overlay");
            presetOverlay.classList.remove("hide");
            camera.gotoPreset(preset.dataset.presetId)
                .then(() => {
                    cameraMoving = false;
                    presetOverlay.classList.add("hide");
                    updatePresetSelection(preset);
                });
        }
    },
    100, {leading: true, trailing: false}
);

const addPreset = function(addPresetDiv) {
    if (cameraMoving) {
        return;
    }

    if (addPresetDiv) {
        cameraMoving = true;

        let parent = document.getElementById("presets");
        let presetToken =  "" + (parent.childElementCount - 1);
        camera.addPreset(presetToken)
            .then(() => {
                cameraMoving = false;
                buildPresets();
            })
            .catch(err => console.log(err));
    }
};

const replacePreset = debounce(
    function(preset) {
        if (cameraMoving) {
            return;
        }

        if (!preset) {
            let presetElements = document.getElementsByClassName("preset focus");
            if (presetElements.length > 0) {
                preset = presetElements[0];
            }
        }

        if (preset) {
            cameraMoving = true;
            camera.setPreset(preset.dataset.presetId)
                .then(resp => {
                    cameraMoving = false;
                    if (resp.data && resp.data.image) {
                        preset.style.setProperty("background-image", `url("${resp.data.image}")`);
                    }
                    updatePresetSelection(preset);
                })
                .catch(err => console.log(err));
        }
    },
    100, {leading: true, trailing: false}
);

function removePresetSelection() {
    let element = document.getElementsByClassName("preset selected");
    if (element.length > 0) {
        element[0].classList.remove("selected");
    }
}

function updatePresetSelection(element) {
    removePresetSelection();
    element.classList.add("selected");
}

function updatePresetImage(preset) {
    if (cameraMoving) {
        return;
    }

    if (!preset) {
        preset = document.querySelector(".preset.selected");
    }

    if (preset && preset.classList.contains("selected")) {
        cameraMoving = true;
        camera.getPresetImage(preset.dataset.presetId)
            .then(resp => {
                cameraMoving = false;
                if (resp.data && resp.data.image) {
                    preset.style.setProperty("background-image", `url("${resp.data.image}")`);
                }
            })
    }
}

function selectNextCamera() {
    let cameraDiv = document.querySelector(".cameraPlaceHolder.selected");
    if (cameraDiv) {
        let nextCamera = cameraDiv.nextElementSibling;
        if (!nextCamera) {
            nextCamera = cameraDiv.parentElement.firstChild;
        }

        if (nextCamera) {
            window.location.href = `/cameras?camera=${nextCamera.dataset.cameraId}`;
        }
    }
}

function selectPreviousCamera() {
    let cameraDiv = document.querySelector(".cameraPlaceHolder.selected");
    if (cameraDiv) {
        let prevCamera = cameraDiv.previousElementSibling;
        if (!prevCamera) {
            prevCamera = cameraDiv.parentElement.lastChild;
        }

        if (prevCamera) {
            window.location.href = `/cameras?camera=${prevCamera.dataset.cameraId}`;
        }
    }
}

window.addEventListener("load", init);

