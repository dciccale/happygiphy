'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const http = require('http');
const Hapi = require('hapi');
const inert = require('inert');
const server = new Hapi.Server();
const config = require('./config');
const rxCode = /^([a-zA-Z0-9_]){6}$/;
const giphyUrl = 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=happy+birthday';
const dataFile = `${__dirname}/data.json`;

// create cache
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '{}');
}

function randomCode() {
  const size = 6;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const l = chars.length;
  let text = '';

  for (let i = 0; i < 5; i++ ) {
    text += chars.charAt(Math.floor(Math.random() * l));
  }

  return text;
}

function template(str, data) {
  for (let key in data) {
    str = str.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'g'), data[key]);
  }
  return str;
}

function fetchImgData(cb) {
  http
    .get(giphyUrl, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let data = {};
        try {
          data = JSON.parse(body).data;
        } catch (e) {
          console.log(`Error: ${e}`);
        }
        cb(data);
      });
    })
    .on('error', (err) => {
      console.log(`Error: ${err}`);
    });
}

function getImgData(code, cb) {
  let cachedImgData = cache(code);
  return cachedImgData ? cb(cachedImgData) : fetchImgData(cb);
}

function saveImgData(code, imgData) {
  let data = readCache();
  if (!data[code]) {
    data[code] = imgData;
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  }
}

function readCache() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function cache(code) {
  let data = readCache();
  return data[code];
}

server.connection({port: config.port});
server.register(inert, () => {});

server.route({
  method: 'GET',
  path: '/',
  handler: function (req, reply) {
    reply.redirect(`/${randomCode()}`);
  }
});

server.route({
  method: 'GET',
  path: '/styles.css',
  handler: function (req, reply) {
    reply.file(`${__dirname}/styles.css`);
  }
});

server.route({
  method: 'GET',
  path: '/powered-by-giphy.png',
  handler: function (req, reply) {
    reply.file(`${__dirname}/powered-by-giphy.png`);
  }
});

server.route({
  method: 'GET',
  path: '/{code}',
  handler: function (req, reply) {
    let code = req.params.code;

    if (rxCode.test(code)) {
      reply.redirect('/');
    } else {
      const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
      getImgData(code, (imgData) => {
        saveImgData(code, imgData);
        reply(template(html, {
          code: code,
          imgUrl: imgData.image_url,
          imgWidth: imgData.image_width,
          imgHeight: imgData.image_height
        }));
      });
    }
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }

  console.log('Server listening on', server.info.uri);
});

module.exports = server;
