import {reduce, find} from "lodash-es";

const DEADZONE = 0.2;

function hasGamepadSupport() {
    return !!(navigator.getGamepads());
}

let currentCount = 0;

function numGamepadsChanged() {
    let count = reduce(navigator.getGamepads(), (sum, gamepad) => {
        if (gamepad && gamepad.connected) {
            sum += 1;
        }
        return sum;
    }, 0);

    let diff = count - currentCount;
    currentCount = count;
    return diff;
}

function getGamepad(index) {
    return find(navigator.getGamepads(), (gamepad) => gamepad && gamepad.index === index);
}

function clampJoystick(x, y) {
    let magnitude = Math.sqrt(x*x + y*y);

    // normalize if greater than one
    if (magnitude > 1) {
        x /= magnitude;
        y /= magnitude;
    }

    return [x, y];
}

function deadzone(value) {
    if (Math.abs(value) < DEADZONE) {
        value = 0;
    } else {
        value = value - Math.sign(value) * DEADZONE;
        value /= (1.0 - DEADZONE);
    }

    return value;
}

export {hasGamepadSupport, numGamepadsChanged, getGamepad, deadzone, clampJoystick};
