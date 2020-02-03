# `<model-viewer data-debug>`

`<model-viewer data-debug>` is a visual debugging layer on top of [@google/model-viewer](https://www.npmjs.com/package/@google/model-viewer).

![Visually debugging model-viewer component](https://raw.githubusercontent.com/theprojectsomething/model-viewer-debugger/master/screenshot.png)

## Installing

The `<model-viewer data-debug>` library is intended for development purposes and can be included directly via various CDNs such as [unpkg.com](https://unpkg.com):
```html
<!-- consider including the latest <model-viewer> build from the website -->
<script async src="https://modelviewer.dev/node_modules/@google/model-viewer/dist/model-viewer.js"></script>

<!-- include the debugger -->
<script async src="https://unpkg.com/model-viewer-debugger"></script>
```

## API

On page load, the debugger will automatically apply to any `<model-viewer>` components that contain a `[data-debug]` attribute.

[Annotations](https://modelviewer.dev/examples/annotations.html), the [camera](https://modelviewer.dev/examples/staging-and-camera-control.html) and [model](https://modelviewer.dev/examples/model-formats.html) can currently be debugged:

```html
<!-- debug everything -->
<model-viewer data-debug></model-viewer>

<!-- debug just the camera and annotations / hotspots -->
<model-viewer data-debug="camera annotations">
    <button slot="hotspot-0"></button>
    <button slot="hotspot-1"></button>
</model-viewer>

<!-- debug a single annotation -->
<model-viewer>
    <button slot="hotspot-0" data-debug></button>
    <button slot="hotspot-1"></button>
</model-viewer>
```

To refresh, remove, or include new `<model-viewer>` components after page load, you can use the `ModelViewerDebugger` available in the global scope:

```js
// clean up and reload debgugging on all <model-viewer> components
ModelViewerDebugger.refresh();

// remove debugging from all <model-viewer> components
ModelViewerDebugger.reset();

// remove debugging from a single <model-viewer> component
ModelViewerDebugger.reset(document.querySelector('model-viewer'));

// basic stats from all <model-viewer> components
ModelViewerDebugger.stats();

// basic stats from a single <model-viewer> component
ModelViewerDebugger.stats(document.querySelector('model-viewer'));
```


## Browser support & considerations

`<model-viewer data-debug>` is really only intended for use in your bleeding-edge development environment(!) and as such very little attention has been paid to browser support. Please feel free to suggest fixes for any glaringly obvious cross-browser issues. IE11 is not supported.


|               | ![Chrome](https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_32x32.png) | ![Firefox](https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_32x32.png) | ![Safari](https://github.com/alrra/browser-logos/raw/master/src/safari/safari_32x32.png) | ![Edge](https://github.com/alrra/browser-logos/raw/master/src/edge/edge_32x32.png) | ![IE11](https://github.com/alrra/browser-logos/raw/master/src/archive/internet-explorer_9-11/internet-explorer_9-11_32x32.png) |
| -------- | --- | --- | --- | --- | --- |
| Desktop  | ✅  | ✅  | ✅  | ✅  | ❌ |
| Mobile   | ✅  | ✅  | ✅  | ✅  | ❌ |

Also keep in mind that [threejs](https://www.npmjs.com/package/three) isn't available on the global scope (it's a dependency of `<model-viewer>`) then it will be downloaded from the [jsDelivr CDN](https://cdn.jsdelivr.net/gh/mrdoob/three.js/build/three.js) at runtime. Not fun in a build environment!


## Versioning and compatability

With Google's groovy `<model-viewer>` component still under development, it's incredibly likely that this debugger will intermittently stop working as that project evolves. To keep things simple I'll be doing my best to keep the versioning in sync (compatability-wise) between the two.

|               | `<model-viewer>` | `[data-debug]` |
| -------- | --- | --- |
| **Latest**  | [![NPM](https://img.shields.io/npm/v/@google/model-viewer.svg)](https://www.npmjs.com/package/@google/model-viewer) | [![NPM](https://img.shields.io/npm/v/model-viewer-debugger.svg)](https://www.npmjs.com/package/model-viewer-debugger)