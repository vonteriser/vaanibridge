# Wearable badge model (.STL)

Drop the final enclosure file here, for example `badge.stl`. Binary and ASCII STL are both supported.

Then activate Page 3 with one call:

```js
VaaniBridgeHooks.mountWearableSTL({
  stlUrl: './assets/models/badge.stl',
  // Optional: override any of the four camera cuts (angles in radians)
  cameraStops: {
    down: { pitch: -1.15, yaw: 0, zoom: 1.05 },
    left: { pitch: -0.15, yaw: -0.95, zoom: 1.05 },
    zoom: { pitch: -0.2, yaw: 0.2, zoom: 1.9 },
    orbit: { pitch: -0.35, yaw: 6.78, zoom: 1.15 },
  },
});
```

The "[IN PROGRESS — RELEASING SOON]" badge is hidden automatically. The four camera buttons and HUD cards drive the model. The viewer also supports drag-to-rotate.

Tips:
- Meshes above about 30,000 triangles are decimated automatically for smooth rendering.
- Export in millimetres at actual size (85 × 54 mm). The viewer normalises the scale itself.
