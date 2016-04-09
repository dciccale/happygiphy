'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const http = require('http');
const Hapi = require('hapi');
const inert = require('inert');
const server = new Hapi.Server();
const config = require('./config');
const apiKey = `api_key=${config.apiKey}`;
const tag = 'tag=happy+birthday';
const giphyUrl = 'http://api.giphy.com/v1/gifs';
const dataFile = `${__dirname}/data.json`;

// create cache
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '{}');
}

function template(str, data) {
  for (let key in data) {
    str = str.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'g'), data[key]);
  }
  return str;
}

function fetchImgData(cb) {
  http
    .get(`${giphyUrl}/random?${apiKey}&${tag}`, (res) => {
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

function getRandomImgData(cb) {
  fetchImgData(cb);
}

function getImgDataById(id, cb) {
  const giphyById = `${giphyUrl}/${id}?${apiKey}`;

  http
    .get(giphyById, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let data = {};
        try {
          data = JSON.parse(body).data;
        } catch (e) {
          console.log(`Error: ${e}`);
        }
        cb(null, data);
      });
    })
    .on('error', (err) => {
      console.log(`Error: ${err}`);
      cb(err);
    });
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

var _imgData;

server.route({
  method: 'GET',
  path: '/',
  handler: function (req, reply) {
    getRandomImgData((imgData) => {
      reply.redirect(`/${imgData.id}`);
    });
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
  path: '/bg.gif',
  handler: function (req, reply) {
    reply.file(`${__dirname}/bg.gif`);
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
  path: '/{id}',
  handler: function (req, reply) {
    let id = req.params.id;

    getImgDataById(id, (err, imgData) => {
      if (err) {
        reply('error');
      } else {
        const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
        reply(template(html, {
          id: id,
          imgVid: imgData.images.original.mp4,
          imgStill: imgData.images.original_still.url,
          imgUrl: imgData.images.original.url,
          imgWidth: imgData.images.original.width,
          imgHeight: imgData.images.original.height
        }));
      }
    });
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }

  console.log('Server listening on', server.info.uri);
});

module.exports = server;
