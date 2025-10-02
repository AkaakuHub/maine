const path = require('node:path');

console.log(">>> Using custom webpack config");

module.exports = {
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@/libs': path.resolve(__dirname, 'src/libs/'),
      '@/services': path.resolve(__dirname, 'src/services/'),
      '@/utils': path.resolve(__dirname, 'src/utils/'),
      '@/types': path.resolve(__dirname, 'src/types/'),
    }
  }
};