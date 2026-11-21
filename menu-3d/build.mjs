// Bundles the 3D menu into ../js/menu-scene.js. three.js stays external: the page's import map
// points "three" and "three/addons/" at js/vendor/three (the same copy the oven intro uses).
import { build } from 'esbuild';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
await build({ entryPoints: [path.join(here, 'src/main.js')], bundle: true, format: 'esm', minify: true, target: 'es2020',
  outfile: path.join(here, '../js/menu-scene.js'), external: ['three', 'three/addons/*'], legalComments: 'none', logLevel: 'warning' });
console.log('built js/menu-scene.js');
