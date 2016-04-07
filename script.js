(function () {
  'use strict';

  var imgContainer = document.querySelector('#img');

  get(function (res) {
    console.log(res.data.image_url);
    var img = document.createElement('img');
    img.src = res.data.image_url;
    imgContainer.appendChild(img);
  });

  function get(cb) {
    var xhr = new window.XMLHttpRequest();

    xhr.addEventListener('load', onLoad(cb));
    xhr.open('GET', 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=happy+birthday');
    xhr.send();
  }

  function onLoad(cb) {
    return function () {
      var json = window.JSON.parse(this.responseText);
      cb(json);
    }
  }
}());
