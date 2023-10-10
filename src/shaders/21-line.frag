precision highp float;

uniform sampler2D brushTexture;
uniform vec3 color;
uniform vec3 colorx;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform float width;
uniform float height;
uniform float opacity;
uniform bool useHue;
uniform float iGlobalTime;
varying float vAngle;
varying vec2 uvCoords;

#define PI 3.14
#pragma glslify: hsl2rgb = require('glsl-hsl2rgb')

void main() {
  vec3 tCol = color;
  if (useHue) {
    float sat = 0.7;
    float light = 0.6;
    
    float rainbow = sin(vAngle * 1.0) * 0.5 + 0.5;
    float hue = 0.0;
    hue += mix(0.5, 0.9, rainbow);
    tCol = hsl2rgb(vec3(hue, sat, light));
  }
  
  vec2 vUv = vec2(uvCoords.x, 1.0 - abs(uvCoords.y));
  // vec4 brush = texture2D(brushTexture, vUv);
  float x = uvCoords.x;
  vec2 resolution = vec2(width, height);
  float step1 = 0.41;

  const vec3 GREEN = vec3( 0.0, 1.0, 0.0);
  const vec3 WHITE = vec3( 1.0, 1.0, 1.0);
  const vec3 RED   = vec3( 1.0, 0.0, 0.0);
  const vec3 BLUE   = vec3( 0.0, 0.0, 1.0);


  if(x > 0.48 && x < 0.7) {
      float z = smoothstep(0.48, 0.7, x);
      tCol = mix(color2, color3, z);
  } else {
      float z = smoothstep(0.215, 0.48, x);
      tCol = mix(color1, color2, z);
  }
  
  gl_FragColor = vec4(tCol, opacity);
  // gl_FragColor.rgb *= gl_FragColor.a;
}