const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cameraConfigs = [
    {
        id: "1",
        hostname: "192.168.108.30",
        port: 8080,
        username: "onvif",
        password: "1234",
        snapshotUrl: "", // populated below using hostname
    }
];

cameraConfigs.forEach(config => config.snapshotUrl = `http://${config.hostname}/dms`);

const app = express();

app.use(morgan("tiny", {
    skip: function(req, res) {
        // exclude the calls to the snapshot image from logging
        // todo -- make this a regex
        return req.baseUrl === "/control" && req.url.startsWith("/1/snapshot");
    }
}));
app.use(cors());
app.use(bodyParser.json());

app.set("view engine", "pug");
app.set("views", "./views");
app.set('json spaces', 2);

app.use("/dist", express.static('dist'));
app.use(express.static('public'));

app.get("/snapshot", (req, res) => {
    res.render("snapshot", {snapshotUrl: cameraConfigs[0].snapshotUrl, cameraId: cameraConfigs[0].id});
});

app.get("/video", (req, res) => {
    res.render("video", {snapshotUrl: cameraConfigs[0].snapshotUrl});
});

const controlRouter = require("./routes/control").init(cameraConfigs);
app.use("/control", controlRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
