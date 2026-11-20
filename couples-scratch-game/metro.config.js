const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
    resolveRequest: (context, moduleName, platform) => {
      // Force Zustand to use its CommonJS build to avoid 'import.meta' SyntaxError in browsers
      if (moduleName === "zustand") {
        return {
          filePath: path.resolve(__dirname, "node_modules/zustand/index.js"),
          type: "sourceFile",
        };
      }
      if (moduleName === "zustand/middleware") {
        return {
          filePath: path.resolve(__dirname, "node_modules/zustand/middleware.js"),
          type: "sourceFile",
        };
      }
      if (moduleName === "zustand/vanilla") {
        return {
          filePath: path.resolve(__dirname, "node_modules/zustand/vanilla.js"),
          type: "sourceFile",
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();
