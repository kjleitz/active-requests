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
    // globalObject: 'this',
    globalObject: 'typeof window !== "undefined" ? setTimeout(() => activeRequests.start(), 0) && this : this',
    path: path.resolve(__dirname, 'dist'),
  },
};
