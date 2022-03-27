const path = require('path');

module.exports = {
    mode: "development",
    devtool: "eval-source-map",
    entry: './src/cameras.js',
    output: {
        filename: 'cameras.js',
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
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                use: [{
                    loader: "file-loader",
                    options: {
                        publicPath: "/dist"
                    }
                }],
            },
            {
                test: /\.pug$/i,
                use: [ "pug-loader"]
            }
        ]
    }
};
