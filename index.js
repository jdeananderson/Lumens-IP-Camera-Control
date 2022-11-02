const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require("lodash");
const cameraControl = require("./routes/control");

const cameraConfigs = require("./config");
cameraConfigs.forEach(config => config.snapshotUrl = `http://${config.hostname}/dms`);
cameraControl.init(cameraConfigs);

const app = express();

app.use(morgan("tiny", {
    skip: function(req, res) {
        // exclude the calls to the snapshot image from logging
        // todo -- make this a regex
        return req.baseUrl === "/control" && req.url.startsWith("/snapshot", 2);
    }
}));
app.use(cors());
app.use(bodyParser.json());

app.set("view engine", "pug");
app.set("views", "./views");
app.set('json spaces', 2);

app.use("/dist", express.static('dist'));
app.use(express.static('public'));

app.get("/cameras", (req, res) => {
    let cameraId = req.query.camera || "1";
    let selectedCamera = _.find(cameraConfigs, {id: cameraId});
    console.log(`selectedCamera: ${selectedCamera.name}`);
    res.render("cameras", {cameraConfigs: cameraConfigs, selectedCamera: selectedCamera});
});

app.get("/video", (req, res) => {
    res.render("video", {snapshotUrl: cameraConfigs[0].snapshotUrl});
});

app.use("/control", cameraControl.router);

app.use("/discovery", require("./routes/discovery"));

app.use("/", (req, res) => {
    res.redirect("/cameras");
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
