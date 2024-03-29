import axios from "axios";

const handlers = [];

export function cameraStop() {
    return axios.put(`${app.server}/control/${app.cameraId}/stop`);
}

export function cameraMove(x, y) {
    let promise = axios.put(`${app.server}/control/${app.cameraId}/move/${x}-${y}`);
    promise.then(onCameraMove);
    return promise;
}

export function cameraZoom(zoom) {
    let promise = axios.put(`${app.server}/control/${app.cameraId}/zoom/${zoom}`);
    promise.then(onCameraMove);
    return promise;
}

export function cameraHome() {
    let promise = axios.put(`${app.server}/control/${app.cameraId}/home`);
    promise.then(onCameraMove);
    return promise;
}

export function getPresets() {
    return axios.get(`${app.server}/control/${app.cameraId}/presets`);
}

export function gotoPreset(preset) {
    return axios.put(`${buildBaseUrl()}/move/preset/${preset}`);
}

export function getPresetImage(presetKey) {
    return axios.get(`${buildBaseUrl()}/preset/${presetKey}/image`);
}

export function addPreset(presetName) {
    return axios.post(`${buildBaseUrl()}/preset`, {presetName})
}

export function setPreset(preset) {
    return axios.put(`${buildBaseUrl()}/preset/${preset}`);
}

export function addOnMoveHandler(handler) {
    handlers.push(handler);
}

export function getSettings() {
    return axios.get(`${buildBaseUrl()}/settings`);
}

export function toggleAutoFocus(currentMode) {
    let newMode = (currentMode === "AUTO") ? "MANUAL" : "AUTO";
    return axios.put(`${buildBaseUrl()}/settings/focus/${newMode}`);
}

function buildBaseUrl() {
    return `${app.server}/control/${app.cameraId}`
}

function onCameraMove() {
    handlers.forEach(handler => handler.call(this));
}
