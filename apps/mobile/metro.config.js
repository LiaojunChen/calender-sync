const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

// Keep Metro aligned with React Native autolinking so native modules are not
// loaded from a second copy elsewhere in the workspace.
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'react-native-gesture-handler': path.join(projectRoot, 'node_modules/react-native-gesture-handler'),
  'react-native-reanimated': path.join(projectRoot, 'node_modules/react-native-reanimated'),
  'react-native-screens': path.join(projectRoot, 'node_modules/react-native-screens'),
  'react-native-safe-area-context': path.join(workspaceRoot, 'node_modules/react-native-safe-area-context'),
  'react-native-worklets': path.join(workspaceRoot, 'node_modules/react-native-worklets'),
};

module.exports = config;
