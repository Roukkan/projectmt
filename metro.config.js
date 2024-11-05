// metro.config.js
module.exports = {
  resolver: {
    sourceExts: ["jsx", "js", "ts", "tsx", "json"],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  config.resolver.assetExts.push("mp3");
  return config;
})();
