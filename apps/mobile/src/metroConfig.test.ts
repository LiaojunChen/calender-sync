import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('metro native module resolution', () => {
  it('pins duplicated native packages to the autolinked paths', async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const workspaceRoot = path.resolve(projectRoot, '..', '..');
    const { default: config } = await import('../metro.config.js');

    expect(config.resolver.disableHierarchicalLookup).toBe(true);
    expect(config.resolver.nodeModulesPaths).toEqual([
      path.join(projectRoot, 'node_modules'),
      path.join(workspaceRoot, 'node_modules'),
    ]);

    expect(config.resolver.extraNodeModules).toMatchObject({
      'react-native-gesture-handler': path.join(projectRoot, 'node_modules/react-native-gesture-handler'),
      'react-native-reanimated': path.join(projectRoot, 'node_modules/react-native-reanimated'),
      'react-native-screens': path.join(projectRoot, 'node_modules/react-native-screens'),
      'react-native-safe-area-context': path.join(workspaceRoot, 'node_modules/react-native-safe-area-context'),
      'react-native-worklets': path.join(workspaceRoot, 'node_modules/react-native-worklets'),
    });
  });
});
