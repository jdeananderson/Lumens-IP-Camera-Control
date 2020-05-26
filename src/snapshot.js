import "./css/snapshot.scss";

import axios from "axios";
import {forEach, reduce} from "lodash-es";

import * as gpLib from "./lib/gamepad";
import {deadzone} from "./lib/gamepad";
import {clampJoystick} from "./lib/gamepad";
let template = require("./views/message.pug");
let gamepadButton = require("./views/gamepad-button.pug");

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
       element.onmousedown = function(event) {
           cameraMove(button.x, button.y)
       };
       element.onmouseup = cameraStop;
    });

    let homeButton = document.getElementById("cameraHome");
    homeButton.onclick = function(event) {
        cameraHome();
    };

    if (gpLib.hasGamepadSupport()) {
        updateGamepads();
        window.requestAnimationFrame(checkForGamepads);
    } else {
        console.log("gamepads not supported")
    }
}

let gamepadIdxs = [];
let foundGamepad = false;
let currentX = 0;
let currentY = 0;
let currentZ = 0;

// todo -- this is actually a gameloop and should be renamed
async function checkForGamepads() {
    if (gpLib.numGamepadsChanged() !== 0) {
        updateGamepads();
    }

    if (gamepadIdxs.length > 0) {
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
                        case 16:
                            await cameraHome();
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
                console.log(`x y: ${x}, ${y}`);
                console.log(`x y rounded: ${roundX}, ${roundY}`);

                currentX = roundX;
                currentY = roundY;

                if (x === 0 && y === 0) {
                    console.log("camera stop");
                    await cameraStop();
                } else {
                    console.log(`camera move: ${x}, ${y}`);
                    await cameraMove(x, -y);
                }
            }

            // right joystick
            let z = deadzone(gamepad.axes[3]);
            let roundZ = Math.round((z + Number.EPSILON) * 100) / 100;
            if (currentZ !== roundZ) {
                console.log(`z (rounded): ${z} (${roundZ})`);

                currentZ = roundZ;

                if (z === 0) {
                    console.log("camera stop");
                    await cameraStop();
                } else {
                    console.log(`camera zoom: ${z}`);
                    await cameraZoom(-z);
                }
            }
        }
    } else {
        foundGamepad = false;
    }

    requestAnimationFrame(checkForGamepads);
}

function updateGamepads() {
    gamepadIdxs = [];
    let gamepads = navigator.getGamepads();
    console.log(`Num of gamepads: ${gamepads.length}`);

    let gamepadsDiv = document.getElementById("gamepads");
    gamepadsDiv.innerHTML = "";
    let active = reduce(gamepads, (count, gamepad) => {
        if (gamepad && gamepad.connected) {
            count += 1;
            let html = gamepadButton({gamepad: gamepad});
            let template = document.createElement("template");
            template.innerHTML = html.trim();
            gamepadsDiv.appendChild(template.content.firstChild);
            gamepadIdxs.push(gamepad.index);
        }
        return count;
    }, 0);

    if (active === 0) {
        gamepadsDiv.innerHTML = template({message: "Attach a gamepad or press a gamepad button"});
    }
}

function cameraStop() {
    return axios.put(`${app.server}/control/${app.cameraId}/stop`);
}

function cameraMove(x, y) {
    return axios.put(`${app.server}/control/${app.cameraId}/move/${x}-${y}`);
}

function cameraZoom(zoom) {
    return axios.put(`${app.server}/control/${app.cameraId}/zoom/${zoom}`);
}

function cameraHome() {
    return axios.put(`${app.server}/control/${app.cameraId}/home`);
}

function updateSnapshot() {
    app.snapshot.img.src = app.snapshotUrl + "?t=" + Date.now();
}

window.addEventListener("load", init);

