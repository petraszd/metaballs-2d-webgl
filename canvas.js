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
    SPEED = 100,
    T1 = 0.005,
    T2 = 0.00005,
    ctx2d,
    time,
    metaPoints = [];

function init () {
  var canvas = document.getElementById('canvas');
  canvas.addEventListener('click', function (e) {
    var dirX = 2 * Math.random() - 1,
        dirY = 2 * Math.random() - 1,
        len = Math.sqrt(dirX * dirX + dirY * dirY);

    metaPoints.push({
      x: e.pageX - canvas.offsetLeft,
      y: e.pageY - canvas.offsetTop,
      dirX: dirX / len,
      dirY: dirY / len
    });
  }, false);
  ctx2d = canvas.getContext('2d');
  start();
};

function start () {
  time = new Date().getTime();
  setInterval(step, 0);
};

function step () {
  var nextTime = new Date().getTime();
  updateMetaPoints((nextTime - time) / 1000);
  time = nextTime;
  draw();
};

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

    metaPoints[i].x += metaPoints[i].dirX * SPEED * tDelta;
    metaPoints[i].y += metaPoints[i].dirY * SPEED * tDelta;
  }
};

function draw () {
  var imgData = ctx2d.getImageData(0, 0, W, H),
      index,
      tempX,
      tempY,
      acc;

  for (var y = 0; y < H; ++y) {
    for (var x = 0; x < W; ++x) {

      acc = 0;
      for (var i = 0; i < metaPoints.length; ++i) {
        tempX = x - metaPoints[i].x;
        tempY = y - metaPoints[i].y;
        tempX *= tempX;
        tempY *= tempY;
        acc += 1 / (tempX + tempY);
      }

      index = ((y * W) + x) * 4;
      if (acc > T1) {
        imgData.data[index + 0] = 255;
        imgData.data[index + 1] = acc * 1024;
        imgData.data[index + 2] = acc * 1024;
        imgData.data[index + 3] = 255;
      } else if (acc > T2) {
        imgData.data[index + 0] = Math.min((acc - T2) / (T1 - T2) * 512, 255);
        imgData.data[index + 1] = 0;
        imgData.data[index + 2] = 0;
        imgData.data[index + 3] = 255;
      } else {
        imgData.data[index + 0] = 0;
        imgData.data[index + 1] = 0;
        imgData.data[index + 2] = 0;
        imgData.data[index + 3] = 255;
      }
    }
  }
  ctx2d.putImageData(imgData, 0, 0);
};
