const path = require('path');

// This is only for the Web code
module.exports = {
  entry: './src/js/pages/web/web.js',
  devtool: 'inline-source-map',
  output: {
    filename: 'web.js',
    path: path.resolve(__dirname, 'out/js/pages/web'),
  },
};

