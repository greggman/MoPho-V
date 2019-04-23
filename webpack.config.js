const path = require('path');

// This is only for the Web code
module.exports = {
  entry: './src/js/pages/web/web.js',
  devtool: 'inline-source-map',
  performance: {
    maxEntrypointSize: 40000000,
  },
  output: {
    filename: 'web.js',
    path: path.resolve(__dirname, 'out/js/pages/web'),
  },
};

