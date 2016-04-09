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

function template(str, data) {
  for (let key in data) {
    str = str.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'g'), data[key]);
  }
  return str;
}

function fetchImgData(url, cb) {
  http
    .get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let data = {};
        try {
          data = JSON.parse(body).data;
        } catch (e) {
          console.log(`Error: ${e}`);
          cb(e);
        }
        cb(null, data);
      });
    })
    .on('error', (e) => {
      console.log(`Error: ${e}`);
    });
}

function getRandomImgData(cb) {
  fetchImgData(`${giphyUrl}/random?${apiKey}&${tag}`, cb);
}

function getImgDataById(id, cb) {
  fetchImgData(`${giphyUrl}/${id}?${apiKey}`, cb);
}

server.connection({port: config.port});
server.register(inert, () => {});

server.route({
  method: 'GET',
  path: '/',
  handler: function (req, reply) {
    getRandomImgData((e, imgData) => {
      if (e) {
        reply('Error try again');
      } else {
        reply.redirect(`/${imgData.id}`);
      }
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

    getImgDataById(id, (e, imgData) => {
      if (e) {
        reply('error');
      } else {
        const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
        reply(template(html, {
          id: id,
          url: `http://www.happygiphy.com/${id}`,
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

server.start((e) => {
  if (e) {
    throw e;
  }

  console.log('Server listening on', server.info.uri);
});

module.exports = server;
