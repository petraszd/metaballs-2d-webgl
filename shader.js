/************************************************************************
 *
 *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                    Version 2, December 2004
 *
 * Copyright (C) 2013 Petras Zdanavičius <petraszd@gmail.com>
 *
 * Everyone is permitted to copy and distribute verbatim or modified
 * copies of this license document, and changing it is allowed as long
 * as the name is changed.
 *
 *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 *
 ************************************************************************/
var W = 800,
    H = 400,
    TEX_DIM = 16,
    MAX_LENGTH = TEX_DIM * 2,
    INIT_T1 = 0.002,
    INIT_T2 = 0.0014,
    INIT_SPEED = 100,
    COLOR_FACTOR_SPEED = 0.25,

    texData = new Float32Array(TEX_DIM * 4),
    Speed = INIT_SPEED,
    colorFactor = 0.0,
    colorDir = 1.0,
    canvas,
    vertices,
    indexes,
    program,
    time,
    gl,
    metaPoints = [];

function error (msg) {
  var errors = document.getElementById('errors')
  errors.style.display = 'block';
  errors.innerHTML += [
    '<p class="err">', msg, '</p>'
  ].join('');
}

function init () {
  canvas = document.getElementById('canvas');

  gl = canvas.getContext('experimental-webgl');
  if (!gl) {
    error('No GL!');
  } else {
    initGL();
    generateRandomMetaPoints(32);
    initEvents();
    start();
  }
};

function initEvents () {
  canvas.addEventListener('click', function (e) {
    if (metaPoints.length >= MAX_LENGTH) {
      return;
    }
    addNewMetaPoint({
      x: e.pageX - canvas.offsetLeft,
      y: H - (e.pageY - canvas.offsetTop)
    });
  }, false);

  var speed = document.getElementById('speed');
  speed.value = Speed;
  speed.addEventListener('change', function (e) {
    Speed = speed.value;
  }, false);

  var size = document.getElementById('size');
  gl.uniform1f(program.uSize, size.value = INIT_T1);
  size.addEventListener('change', function (e) {
    gl.uniform1f(program.uSize, size.value);
  }, false);

  var bloom = document.getElementById('bloom');
  gl.uniform1f(program.uBloom, bloom.value = INIT_T2);
  bloom.addEventListener('change', function (e) {
    gl.uniform1f(program.uBloom, bloom.value);
  }, false);
};

function addNewMetaPoint (pos) {
    var dirX = 2 * Math.random() - 1,
        dirY = 2 * Math.random() - 1,
        len = Math.sqrt(dirX * dirX + dirY * dirY);

    metaPoints.push({
      x: pos.x,
      y: pos.y,
      dirX: dirX / len,
      dirY: dirY / len
    });
};

function generateRandomMetaPoints (count) {
  for (var i = 0; i < count; ++i) {
    addNewMetaPoint({
      x: Math.random() * W,
      y: Math.random() * H
    });
  }
}

function reflect (m, normalX, normalY) {
  var prefix = -2 * (m.dirX * normalX + m.dirY * normalY);
  m.dirX = prefix * normalX + m.dirX;
  m.dirY = prefix * normalY + m.dirY;
}

function updateMetaPoints (tDelta) {
  for (var i = 0; i < metaPoints.length; ++i) {
    if (metaPoints[i].x > W) {
      reflect(metaPoints[i], -1, 0);
      metaPoints[i].x = W - 1;
    } else if (metaPoints[i].x < 0) {
      reflect(metaPoints[i], 1, 0);
      metaPoints[i].x = 1;
    } else if (metaPoints[i].y > H) {
      reflect(metaPoints[i], 0, -1);
      metaPoints[i].y = H - 1;
    } else if (metaPoints[i].y < 0) {
      reflect(metaPoints[i], 0, 1);
      metaPoints[i].y = 1;
    }

    metaPoints[i].x += metaPoints[i].dirX * Speed * tDelta;
    metaPoints[i].y += metaPoints[i].dirY * Speed * tDelta;
  }
  updatePositionTexture();
};

function makeShader (domId) {
  var tag = document.getElementById(domId),
      shaderSrc = tag.firstChild.textContent,
      shader;

  if (tag.type == 'x-shader/x-fragment') {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (tag.type == 'x-shader/x-vertex') {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSrc);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    error(tag.type);
    error(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function initGL () {
  if (!gl.getExtension('OES_texture_float')) {
    error('OES_texture_float extension is not supported');
    return;
  }

  gl.viewport(0, 0, W, H);
  gl.width = W;
  gl.height = H;
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  initShaders();
  initTexture();
  initBuffers();
};

function initTexture () {
  var texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(program.uPositionTex, texture);
};

function updatePositionTexture () {

  var index;
  for (var i = 0; i < metaPoints.length; ++i) {
    if (i % 2 == 0) {
      index = parseInt(i / 2) * 4;
    } else {
      index = parseInt(i / 2) * 4 + 2;
    }

    texData[index + 0] = metaPoints[i].x;
    texData[index + 1] = metaPoints[i].y;
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    TEX_DIM, 1,
    0,
    gl.RGBA,
    gl.FLOAT,
    texData
  );
};

function initBuffers () {
  vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  data = new Float32Array([
    0.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    0.0, 0.0, 0.0
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  indexes = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexes);
  data = new Uint16Array([0, 1, 2, 0, 2, 3]);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
};

function initShaders () {
  var fragmentShader = makeShader('shader-fs'),
      vertexShader = makeShader('shader-vs');

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    error('Could not initialise shaders');
  }

  gl.useProgram(program);

  program.aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(program.aPosition);

  program.uPositionTex = gl.getUniformLocation(program, 'uPositionTex');
  program.uSize = gl.getUniformLocation(program, 'uSize');
  program.uBloom = gl.getUniformLocation(program, 'uBloom');
  program.uColor = gl.getUniformLocation(program, 'uColor');
};

function updateColorFactor (tDelta) {
  colorFactor += tDelta * colorDir * COLOR_FACTOR_SPEED;

  if (colorFactor > 1.0) {
    colorFactor = 1.0;
    colorDir = -1.0;
  } else if (colorFactor < 0.0) {
    colorFactor = 0.0;
    colorDir = 1.0;
  }

  gl.uniform1f(program.uColor, colorFactor);
};

function draw () {
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.vertexAttribPointer(program.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexes);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  gl.flush();
};

function start () {
  time = new Date().getTime();
  setInterval(step, 0);
};

function step () {
  var nextTime = new Date().getTime();
  var tDelta = (nextTime - time) / 1000;
  updateMetaPoints(tDelta);
  updateColorFactor(tDelta);
  time = nextTime;
  draw();
};
