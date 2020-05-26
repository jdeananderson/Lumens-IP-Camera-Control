const path = require('path');

module.exports = {
    mode: "development",
    devtool: "eval-source-map",
    entry: './src/snapshot.js',
    output: {
        filename: 'snapshot.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.scss$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.pug$/i,
                use: [ "pug-loader"]
            }
        ]
    }
};
