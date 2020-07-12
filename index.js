const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cameraConfigs = [
    {
        id: "1",
        hostname: "192.168.29.229",
        port: 8080,
        username: "onvif",
        password: "1234",
        snapshotUrl: "", // populated below using hostname
    }
];

cameraConfigs.forEach(config => config.snapshotUrl = `http://${config.hostname}/dms`);

const app = express();

app.use(morgan('tiny'));
app.use(cors());
app.use(bodyParser.json());

app.set("view engine", "pug");
app.set("views", "./views");

app.use("/dist", express.static('dist'));
app.use(express.static('public'));

app.get("/snapshot", (req, res) => {
    res.render("snapshot", {snapshotUrl: cameraConfigs[0].snapshotUrl, cameraId: cameraConfigs[0].id});
});

const controlRouter = require("./routes/control").init(cameraConfigs);
app.use("/control", controlRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});