# Springfield Hot Bagels

Website for Springfield Hot Bagels, 207 Morris Avenue, Springfield, NJ.

Plain static site (no build step). Shop hours, menu and catering items live in `js/details.js`.

## 3D menu

The animated menu is built from `menu-3d/src` into `js/menu-scene.js`:

```
cd menu-3d && npm install && node build.mjs
```

Menu items and prices live in `menu-3d/src/menu.js` and `js/details.js`. Prices are placeholders ("Price to be confirmed") and "Iced coffee" is a guess until the owner confirms. The order form builds a summary to call in; it does not send anything yet.

Scanned assets in `assets/3d` (croissant model, bread-crust surface detail, studio HDRI) are CC0 from Poly Haven (polyhaven.com).
