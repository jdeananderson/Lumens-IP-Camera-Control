import "./css/snapshot.scss";

import {forEach, reduce} from "lodash-es";

import * as gpLib from "./lib/gamepad";
import {deadzone} from "./lib/gamepad";
import {clampJoystick} from "./lib/gamepad";
import * as camera from "./lib/camera";
let template = require("./views/message.pug");
let gamepadButton = require("./views/gamepad-button.pug");
let presetsTemplate = require("./views/presets.pug");

app.snapshot = {
    timeoutPeriod: 5,
    img: new Image(),
};

app.server = "http://localhost:4000";

app.snapshot.img.onload = function() {
    let canvas = document.getElementById("imgCanvas");
    let context = canvas.getContext("2d");

    context.drawImage(app.snapshot.img, 0, 0);
    setTimeout(updateSnapshot, app.snapshot.timeoutPeriod);
};

function init() {
    updateSnapshot();

    configureArrowButtons();

    buildPresets();

    if (gpLib.hasGamepadSupport()) {
        updateGamepads();
        window.requestAnimationFrame(gameloop);
    } else {
        console.log("gamepads not supported")
    }

    camera.addOnMoveHandler(removePresetFocus);
}

let gamepadIdxs = [];

let foundGamepad = false;
let currentX = 0;
let currentY = 0;
let currentZ = 0;

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
    }
}

function updateSnapshot() {
    app.snapshot.img.src = app.snapshotUrl + "?t=" + Date.now();
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
}

function buildPresets() {
    camera.getPresets().then(results => {
        let presetsDiv = document.getElementById("presets");
        presetsDiv.innerHTML = presetsTemplate({presets: results.data});

        // todo -- prevent other clicks until gotoPreset returns
        forEach(document.getElementsByClassName("preset"), preset => {
            preset.onclick = function(event) {
                event.stopPropagation();
                camera.gotoPreset(preset.dataset.presetId).then(() => updatePresetFocus(preset));
            }
        });

        forEach(document.getElementsByClassName("preset-replace"), replaceButton => {
            replaceButton.onclick = function(event) {
                event.stopPropagation();
                camera.setPreset(replaceButton.dataset.presetId)
                    .then(resp => {
                        if (resp.data && resp.data.image) {
                            replaceButton.parentElement.style.setProperty("background-image", `url("${resp.data.image}")`);
                        }
                        updatePresetFocus(replaceButton.parentElement)
                    });
            }
        })
    })
}

function removePresetFocus() {
    let element = document.getElementsByClassName("preset selected");
    if (element.length > 0) {
        element[0].classList.remove("selected");
    }
}

function updatePresetFocus(element) {
    removePresetFocus();
    element.classList.add("selected");
}

window.addEventListener("load", init);

