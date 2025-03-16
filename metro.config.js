const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  // Add svg to assetExts to make sure Metro includes it in the bundle
  config.resolver.assetExts = resolver.assetExts.filter(ext => ext !== 'svg');
  
  // Add svg to sourceExts to allow importing .svg files
  config.resolver.sourceExts = [...resolver.sourceExts, 'svg'];

  // Configure the transformer for svg files
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

  return config;
})();
