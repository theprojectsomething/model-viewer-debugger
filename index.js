const ModelViewerDebugger = (() => {
// property store
const props = { THREEv: 'r113' };
// method store
const fn = {

  // refresh debugging on all model viewers
  refresh() {
    // clean up any leftovers
    fn.reset();

    // look for viewers on the page, i.e. <model-viewer data-debug> OR <model-viewer><button slot="hotspot" data-debug>[...] 
    props.viewers = Array.prototype.slice.call(document.querySelectorAll("model-viewer[src]"))
    .filter(viewer => viewer.matches('[data-debug]') || viewer.querySelector('[data-debug]'))
    .map($el => ({ $el }));

    // if no viewers exist ...
    if (!props.viewers.length) return fn.log('0 <model-viewer> components found', true);

    // log the viewers count
    fn.log(props.viewers.length + ' <model-viewer> components found');

    // check for the THREE library (and load where unavailable)
    fn.loadTHREE();

    // check if each model-viewer component is loaded / wait for it / process it
    props.viewers.forEach((viewer) => {
      // set up a listener for all future model loads
      viewer.onModel = () => fn.process(viewer);
      viewer.$el.addEventListener('model-visibility', viewer.onModel);

      // if <model-viewer> component is ready go ahead process the viewer (just in case 'model-visibility' has already fired!)
      if (viewer.$el.getCameraOrbit) fn.process(viewer);
    });
  },

  loadTHREE() {
    // already loaded!
    if (window.THREE) return;
    
    // disable further invocations
    fn.loadTHREE = () => {};
    
    // load the script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://cdn.jsdelivr.net/gh/mrdoob/three.js@${props.THREEv}/build/three.js`;

    // wait for load (and then a moment) before processing the viewer queue
    script.addEventListener('load', () => setTimeout(() => (props.queue || []).forEach(v => fn.process(v)), 500));
    document.head.appendChild(script);
  },
  
  process(viewer) {
    // if THREE isn't loaded, add to the queue
    if (!window.THREE) {
      props.queue = (props.queue || []).concat(viewer || []);
      return;
    }

    // cleanup viewer in case of model change
    fn.cleanup(viewer);

    // check items to debug (camera, annotations, model, etc.)
    viewer.debug = viewer.$el.dataset.debug
      // split any debug items specified on component e.g. <model-viewer data-debug="camera annotations"> / { camera: true, annotations: true }
      ? viewer.$el.dataset.debug.split(' ').reduce((_, k) => ({ ..._, [k]: true}), {})
      // alternatively debug everything if empty attribute exists i.e. <model-viewer data-debug>
      : { all: viewer.$el.matches('[data-debug]') };

    // for annotations, list actual hotspot elements to debug
    viewer.debug.annotations = viewer.$el.querySelectorAll('[slot^="hotspot-"]'
      // if not debugging all annotations, check for individual debug items e.g. <button slot="hotspot" data-debug>
      + (viewer.debug.all || viewer.debug.annotations ? '' : '[data-debug]'));
    
    // check that there are debug items ...
    // where a model has been updated there may be none
    if (!Object.keys(viewer.debug).find(v => (v || '').length)) return;
    
    // find the component's scene
    viewer.scene = viewer.$el[Reflect.ownKeys(viewer.$el).find(s => String(s) === "Symbol(scene)")];
    if (!viewer.scene) return fn.log(['scene not found', viewer.$el.src], true);

    // create a container for our helpers and add it to the scene
    viewer.object3D = new THREE.Object3D();
    viewer.scene.add(viewer.object3D);
    
    // if model is required (but isn't ready) wait for subsequent 'model-visibility' call
    if (!fn.model(viewer)) return;

    // initialise each helper
    fn.camera.init(viewer);
    fn.annotations.init(viewer);

    // listen for camera changes where necessary
    if (viewer.debug.camera || viewer.debug.annotations) {
      viewer.onUpdate = () => fn.update(viewer);
      viewer.$el.addEventListener('camera-change', viewer.onUpdate, false);
    }
  },

  update(viewer) {
    // calculate camera fov, orbit, position and normal
    const fov = viewer.$el.getFieldOfView();
    const orbit = viewer.$el.getCameraOrbit();
    const position = new THREE.Vector3().setFromSpherical(orbit);
    const normal = position.clone().normalize();
    viewer.stats = { fov, orbit, position, normal };

    // render the annotations and camera
    fn.camera.render(fov, orbit, position, normal, viewer);
    fn.annotations.render(normal, viewer);
  },

  model(viewer) {
    if (!viewer.debug.all && !viewer.debug.model) return true;
    viewer.debug.model = true;

    // warn the users!
    if (!props.warned) {
      props.warned = true;
      fn.log('the model helper is buggy, feel free to suggest a fix!', true);
    }
    
    // find the model
    const model = viewer.scene.children[0].children.find(
      o => o.name === "Model"
    ).children[0].children[0];

    if (!model) return false;
    /*
      this should really be a BoxHelper BUT buffer geometries don't work
      .. probably because of different THREE lib embedded in component vs. global
      .. as such scale and positioning logic is just meant to work in this example
    */
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    
    // get the bounding box of the model
    const box3 = new THREE.Box3().setFromObject(model);
    const v3 = new THREE.Vector3();
    box3.getCenter(v3);
    
    // find the center and update the mesh per some weird case-by-case logic
    box.position.y = -v3.y;
    box.position.z = -v3.z / 2;
    
    // find the size and scale the mesh by the correct logic
    box3.getSize(v3);
    box.scale.copy(v3.multiplyScalar(1 / model.scale.x));
    
    // find the rotation and copy per some weird case-by-case logic
    box.rotation.setFromVector3(model.rotation.toVector3());

    // add the mesh to our scene
    viewer.object3D.add(box);
    return true;
  },

  camera: {
    init(viewer) {
      if (!viewer.debug.all && !viewer.debug.camera) return;
      viewer.debug.camera = true;

      // get the camera target and the current radius from the camera
      const target = viewer.$el.getCameraTarget();
      const radius = viewer.scene.camera.position.clone().distanceTo(target);
      
      // our camera helper (blue radial plane) sits at conjugate orbit to camera starting position
      const plane = new THREE.Mesh(
        new THREE.SphereGeometry(radius + 1, 16, 16, (Math.PI * 5) / 4, Math.PI / 2, (Math.PI * 3) / 8, Math.PI / 4),
        new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })
      );
      plane.rotation.copy(viewer.scene.camera.rotation);
      viewer.object3D.add(plane);

      // add a <div> for outputting our camera info
      viewer.$output = document.createElement('div');
      viewer.$output.style = 'position:absolute;bottom:0;left:0;white-space:pre;background:rgba(255,255,255,0.4);padding:1em;';
      viewer.$el.appendChild(viewer.$output);

      // update the viewer
      fn.update(viewer);
    },

    render(fov, orbit, position, normal, viewer) {
      // if camera is being debugged, update the output
      if (!viewer.$output) return;

      const s = viewer.stats;
      viewer.$output.innerHTML = [
        '<strong>Camera</strong>',
        `- orbit: ${(orbit.theta * 180 / Math.PI)|0}deg<sub>θ</sub> ${(orbit.phi * 180 / Math.PI)|0}deg<sub>φ</sub> ${+orbit.radius.toFixed(2)}m`,
        `- normal: ${normal.x.toFixed(2)}<sub>x</sub> ${normal.y.toFixed(2)}<sub>y</sub> ${normal.z.toFixed(2)}<sub>z</sub>`,
        `- position: ${position.x.toFixed(1)}m<sub>x</sub> ${position.y.toFixed(1)}m<sub>y</sub> ${position.z.toFixed(1)}m<sub>z</sub>`,
        `- fov: ${fov|0}deg`,
      ].join('\n');
    },
  },
  
  annotations: {
    init(viewer) {
      if (!viewer.debug.annotations) return;

      // create a list of annotations to update (excludes annotations that are always visible - see below)
      viewer.annotations = [];

      // get the initial scene radius
      const radius = viewer.$el.getCameraOrbit().radius;

      // iterate over the debuggable annotations, adding those with valid normals to the update list
      Array.prototype.slice.call(viewer.debug.annotations).forEach(($el, i) => {

        // parse the position and normal from the data attributes
        const position = new THREE.Vector3().fromArray($el.dataset.position.split(' ').map(n => +n));
        // the normal defaults to [0 1 0] as per the current <model-viewer> implementation
        const normal = new THREE.Vector3().fromArray(($el.dataset.normal || '0 1 0').split(' ').map(n => +n)).normalize();
        
        // MAGIC! prepare a fancy new colour for each annotation helper
        const color = '#ffffff'.replace(new RegExp(`(#.{${(i * 2) % 5}})..`), '$100')
          .replace(new RegExp(`(#.{${(i + Math.ceil(Math.random() * 3)) % 6}}).`), '$10');

        // where a valid normal is supplied (length > 0) add a helper plane to the scene
        if (normal.length()) {

          // create a sqaure plane half the camera's radius in length
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry( radius * 0.5, radius * 0.5, 1 ),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
          );

          // copy the position and rotation of the annotation
          plane.position.copy(position);
          plane.rotation.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(normal, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0))
          );

          // add it to the scene
          viewer.object3D.add(plane);

          // add it and some details to the list of updating annotations
          viewer.annotations.push({ $el, plane, normal, position });
        } else {
          // set [data-debug-visible] to always-on
          $el.dataset.debugVisible = 1;

          // where we don't have a valid normal the annotation will always be visible
          // so we designate that with a small sphere
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry( radius * 0.05, 16, 16 ),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
          );
          sphere.position.copy(position);
          viewer.object3D.add(sphere);
        }
      });

      // update the viewer
      fn.update(viewer);
    },
    
    render(normal, viewer) {
      // if annotations are being updated, calculate ratio of visibility and update [data-debug-visible]
      if (!viewer.annotations || !viewer.annotations.length) return;
      const maxAngle = 80; // max visible angle in degrees
      viewer.annotations.forEach(item => {
        item.visible = 1 - item.normal.angleTo(normal) * 180 / Math.PI / maxAngle;
        item.$el.dataset.debugVisible = (100 * item.visible)|0;
      });
    },
  },

  reset($el) {
    const list = $el ? props.viewers.find(viewer => viewer.$el === $el) : props.viewers;
    [].concat(list || []).forEach((viewer) => {
      viewer.$el.removeEventListener('model-visibility', viewer.onModel);
      fn.cleanup(viewer);
    });
    delete props.viewers;
  },

  cleanup(viewer) {
    if (viewer.onUpdate) viewer.$el.removeEventListener('camera-change', viewer.onUpdate);
    while (viewer.object3D && viewer.object3D.children.length) {
      viewer.object3D.remove(viewer.object3D.children[0]);
    }
    if (viewer.$output && viewer.$output.offsetParent) {
      viewer.$output.offsetParent.removeChild(viewer.$output);
      delete viewer.$output;
    }
    delete viewer.annotations;
    delete viewer.debug;
  },

  log(msg, warn) {
    console[warn ? 'warn' : 'log'].apply(this, ['[MODEL-VIEWER-HELPER]'].concat(msg));
  },
};

// initialise on load
document.addEventListener('DOMContentLoaded', fn.refresh);

// return some minor functionality
return {
  refresh: () => fn.refresh(),
  reset: $el => fn.reset($el),
  stats: $el =>
    [].concat($el ? props.viewers.find(viewer => viewer.$el === $el) || [] : props.viewers)
    .map(viewer => ({ ...viewer.stats, $el: viewer.$el })).reduce((_, v, i, list) => i ? list : _),
}
})();