#!/usr/bin/env node

const babel = require("@babel/core");
const fs = require('fs');
const minify = require('minify');

const SOURCE = './src/DropZone.js';

const target = {
  es5: 'build/dropzone.es5.js',
  es5min: 'build/dropzone.es5.min.js',
  es5_dropin: 'build/dropzone.es5.dropin.js',
  es5min_dropin: 'build/dropzone.es5.dropin.min.js',
  es6: 'build/dropzone.es6.js',
  es6min: 'build/dropzone.es6.min.js'
}

const header = fs.readFileSync('./header.js');
const polyfill = fs.readFileSync('./src/Promise.polyfill.js');

function babel_make_es5(prepend, source, outfile = null) {
  return new Promise((res, rej) => {
    fs.readFile(source, 'utf8', (err, data) => {
      if (err) {
        return rej(err);
      }

      const babelResult = babel.transform(data, {
        "presets": [
          ["@babel/preset-env", {
          }],
        ]
      });

      fs.writeFile(outfile, prepend + babelResult.code, 'utf8', (err) => {
        if (err) return rej(err);

        res(babelResult.code);
      })
    })
  })
}

fs.writeFile(target.es6, header, 'utf8', (err) => {
  if (err) throw err;

  fs.readFile(SOURCE, 'utf8', (err, es6code) => {
    if (err) throw err;

    fs.appendFile(target.es6, es6code, 'utf8', (err) => {
      if (err) throw err;

      console.log("es6 done");
    })
  })
})


babel_make_es5(header, SOURCE, target.es5).then((es5code) => {
  console.log("es5 done");

  fs.writeFile(target.es5_dropin, header + polyfill + es5code, (err) => {
    if (err) throw err;
    console.log("es5 dropin done");
  });

  minify.js(es5code, (err, es5min) => {
    if (err) throw err;

    fs.writeFile(target.es5min, header + es5min, 'utf8', (err) => {
      if (err) throw err;

      console.log("es5 min done");
    });

    fs.writeFile(target.es5min, header + polyfill + es5min, 'utf8', (err) => {
      if (err) throw err;

      console.log("es5 dropin min done");
    });
  });
}).catch(err => {
  console.log(err);
});
