const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function override(config, env) {
  // Find the HtmlWebpackPlugin instance
  const htmlWebpackPluginInstance = config.plugins.find(
    (plugin) => plugin instanceof HtmlWebpackPlugin
  );

  // Set inject option to false
  if (htmlWebpackPluginInstance) {
    htmlWebpackPluginInstance.options.inject = false;
    htmlWebpackPluginInstance.options.minify = false;
  }

  return config;
};
