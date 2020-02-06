const path = require('path')

const babelConfig = {
  presets: [
    [
      '@babel/env',
      {
        modules: false,
        useBuiltIns: 'usage',
        corejs: 3,
      }
    ]
  ],
  plugins: [
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    ['@babel/plugin-transform-runtime', {
      helpers: true,
      regenerator: true,
      useESModules: true,
    }]
  ]
}

module.exports = [{
  entry: './src/sdk.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'urlwallet-sdk.js',
    library: 'UrlWalletSDK',
    libraryTarget: 'var',
    libraryExport: 'default',
  }
}, {
  entry: './src/url-wallet.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'url-wallet.js',
  }
}]
