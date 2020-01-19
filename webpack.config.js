const path = require('path');

module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules|dist/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'index.js',
    library: 'activeRequests',
    libraryTarget: 'umd',
    libraryExport: 'default',
    // This is a really shitty hack on my part, but it results in the following
    // behavior: If the active-requests library is being included on the page
    // via a script tag/CDN link, it will run `activeRequests.start()` as soon
    // as it loads. If, instead, the library is being imported into another
    // script as part of a build process, it will not run the `start()` method
    // until the author explicitly calls `activeRequests.start()`.
    globalObject: 'typeof window !== "undefined" ? setTimeout(() => activeRequests.start(), 0) && this : this',
    path: path.resolve(__dirname, 'dist'),
  },
};
