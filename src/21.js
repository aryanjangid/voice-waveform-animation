const createOrbit = require("orbit-controls");
const createCamera = require("perspective-camera");
const createShader = require("gl-shader");
const glAudioAnalyser = require("gl-audio-analyser");

const assign = require("object-assign");
const setIdentity = require("gl-mat4/identity");
const newArray = require("array-range");
const once = require("once");
const lerp = require("lerp");
const vignette = require("gl-vignette-background");
const glslify = require("glslify");
const gl = require("webgl-context")({ width: 400, height: 300 });
const hexRgbByte = require("hex-rgb");
const createLine = require("./gl/gl-line-3d");
const error = require("./fatal-error")();
const desktopOnly = require("./desktop-only");
const isMobile = require("./is-mobile");
const hexRgb = (str) => hexRgbByte(str).map((x) => x / 255);

const isSafari =
  /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
const steps = 200;
const segments = isSafari ? 50 : 110;
const radius = 0.01;
const thickness = 0.001;
const src = "assets/highroad.mp3";

const defaults = {
  opacity: 1.0,
  useHue: false,
  additive: false,
};

const presets = [
  {
    gradient: ["#fff", "#4f4f4f"],
    color: "#f6ed2d",
    color1: "#9895c2",
    color2: "#de4a7b",
    color3: "#f6ed2d",
    useHue: false,
  },
];

let settings = presets[Math.floor(Math.random() * presets.length)];
settings = assign({}, defaults, settings);

const colorVec = hexRgb(settings.color);

const canvas = gl.canvas;
document.body.appendChild(canvas);

const AudioContext = window.AudioContext || window.webkitAudioContext;
const supportedTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
const app = require("canvas-loop")(canvas, {
  scale: window.devicePixelRatio,
});

const background = vignette(gl);
background.style({
  aspect: 1,
  color1: hexRgb("#0c0026"),
  color2: hexRgb("#0c0026"),
});

const identity = setIdentity([]);
const shader = createShader(
  gl,
  glslify(__dirname + "/shaders/21-line.vert"),
  glslify(__dirname + "/shaders/21-line.frag")
);

const camera = createCamera({
  fov: (30 * Math.PI) / 180,
  position: [0, 0, 1],
  near: 0.0001,
  far: 10000,
});

const controls = createOrbit({
  element: canvas,
  distanceBounds: [0.5, 100],
  distance: 0.5,
});

const paths = newArray(segments).map(createSegment);
const lines = paths.map((path) => {
  return createLine(gl, shader, path);
});

let analyser;
start();

function start() {
  if (supportedTextures < 1) {
    return error("This demo requires a GPU with vertex texture sampling.");
  }
  if (!AudioContext) {
    return error("This demo requires a WebAudio capable browser.");
  }
  if (isMobile()) {
    return desktopOnly();
  }

  const loader = document.querySelector(".loader");

  if (navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia supported.');

    const onSuccess = (stream) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      // source.connect(audioContext.destination);
      console.log(source)
      analyser = glAudioAnalyser(gl, source, audioContext);
      app.start();
      loader.style.display = "none";
    }

    let onError = function(err) {
      console.log('The following error occured: ' + err);
    }
    navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(onSuccess, onError);
  } else {
      console.log('getUserMedia not supported on your browser!');
  }
}

let time = 0;
app.on("tick", (dt) => {
  time += Math.min(30, dt) / 1000;

  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;

  // set up our camera
  camera.viewport[2] = width;
  camera.viewport[3] = height;
  controls.update(camera.position, camera.direction, camera.up);
  camera.update();

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const size = Math.min(width, height) * 1.5;
  gl.disable(gl.DEPTH_TEST);
  background.style({
    scale: [(1 / width) * size, (1 / height) * size],
  });
  background.draw();

  gl.disable(gl.DEPTH_TEST); // off for now
  gl.enable(gl.BLEND);
  if (settings.additive) gl.blendFunc(gl.ONE, gl.ONE);
  else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);

  shader.bind();
  shader.uniforms.iGlobalTime = time;
  shader.uniforms.radius = radius;
  shader.uniforms.audioTexture = 0;
  shader.uniforms.opacity = settings.opacity;
  shader.uniforms.useHue = settings.useHue;
  shader.uniforms.width = settings.width;
  shader.uniforms.height = settings.height;
  shader.uniforms.color1 = hexRgb(settings.color1);
  shader.uniforms.color2 = hexRgb(settings.color2);
  shader.uniforms.color3 = hexRgb(settings.color3);

  analyser.bindFrequencies(0);

  lines.forEach((line, i, list) => {
    line.color = colorVec;
    line.thickness = thickness;
    line.model = identity;
    line.view = camera.view;
    line.projection = camera.projection;
    line.aspect = width / height;
    line.miter = 1;
    shader.uniforms.index = i / (list.length - 1);
    line.draw();
  });
});

function createSegment() {
  return newArray(steps).map((i, _, list) => {
    const x = lerp(-1, 1, i / (list.length - 1));
    return [x, 0, 0];
  });
}
