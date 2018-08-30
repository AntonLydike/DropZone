/**
 * DropZone (no upload) COPYRIGHT (c) by Anton Lydike
 * v1.0.1
 *
 * https://github.com/AntonLydike/DropZone
 */
/**
 * Promise Polyfill: https://github.com/taylorhakes/promise-polyfill
 */
(function () { 'use strict';

/**
 * @this {Promise}
 */
function finallyConstructor(callback) {
  var constructor = this.constructor;
  return this.then(
    function(value) {
      return constructor.resolve(callback()).then(function() {
        return value;
      });
    },
    function(reason) {
      return constructor.resolve(callback()).then(function() {
        return constructor.reject(reason);
      });
    }
  );
}

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function noop() {}

// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
  return function() {
    fn.apply(thisArg, arguments);
  };
}

/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
  if (!(this instanceof Promise))
    throw new TypeError('Promises must be constructed via new');
  if (typeof fn !== 'function') throw new TypeError('not a function');
  /** @type {!number} */
  this._state = 0;
  /** @type {!boolean} */
  this._handled = false;
  /** @type {Promise|undefined} */
  this._value = undefined;
  /** @type {!Array<!Function>} */
  this._deferreds = [];

  doResolve(fn, this);
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (self._state === 0) {
    self._deferreds.push(deferred);
    return;
  }
  self._handled = true;
  Promise._immediateFn(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
      return;
    }
    var ret;
    try {
      ret = cb(self._value);
    } catch (e) {
      reject(deferred.promise, e);
      return;
    }
    resolve(deferred.promise, ret);
  });
}

function resolve(self, newValue) {
  try {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self)
      throw new TypeError('A promise cannot be resolved with itself.');
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = newValue.then;
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(bind(then, newValue), self);
        return;
      }
    }
    self._state = 1;
    self._value = newValue;
    finale(self);
  } catch (e) {
    reject(self, e);
  }
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  finale(self);
}

function finale(self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    Promise._immediateFn(function() {
      if (!self._handled) {
        Promise._unhandledRejectionFn(self._value);
      }
    });
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i]);
  }
  self._deferreds = null;
}

/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
  var done = false;
  try {
    fn(
      function(value) {
        if (done) return;
        done = true;
        resolve(self, value);
      },
      function(reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      }
    );
  } catch (ex) {
    if (done) return;
    done = true;
    reject(self, ex);
  }
}

Promise.prototype['catch'] = function(onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  // @ts-ignore
  var prom = new this.constructor(noop);

  handle(this, new Handler(onFulfilled, onRejected, prom));
  return prom;
};

Promise.prototype['finally'] = finallyConstructor;

Promise.all = function(arr) {
  return new Promise(function(resolve, reject) {
    if (!arr || typeof arr.length === 'undefined')
      throw new TypeError('Promise.all accepts an array');
    var args = Array.prototype.slice.call(arr);
    if (args.length === 0) return resolve([]);
    var remaining = args.length;

    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              reject
            );
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.resolve = function(value) {
  if (value && typeof value === 'object' && value.constructor === Promise) {
    return value;
  }

  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

Promise.race = function(values) {
  return new Promise(function(resolve, reject) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};

// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
  (typeof setImmediate === 'function' &&
    function(fn) {
      setImmediate(fn);
    }) ||
  function(fn) {
    setTimeoutFunc(fn, 0);
  };

Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
  if (typeof console !== 'undefined' && console) {
    console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
  }
};

/** @suppress {undefinedVars} */
var globalNS = (function() {
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  throw new Error('unable to locate global object');
})();

if (!('Promise' in globalNS)) {
  globalNS['Promise'] = Promise;
} else if (!globalNS.Promise.prototype['finally']) {
  globalNS.Promise.prototype['finally'] = finallyConstructor;
}

})();
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

;

(function (global, factory) {
  (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.DropZone = function (_ref) {
    var dropZone = _ref.dropZone,
        bytesToString = _ref.bytesToString;
    dropZone.bytesToString = bytesToString;
    return dropZone;
  }(factory());
})(window, function () {
  var sizes = ['', 'Kilo', 'Mega', 'Giga', 'Tera', 'Peta', 'Exa', 'Zetta', 'Yotta'],
      sizes_s = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      customMimes = {
    php: "application/x-php",
    less: "application/less+css",
    sass: "application/sass+css",
    babel: "application/babel+js",
    coffee: "application/vnd.coffeescript",
    jade: "application/jade+html",
    pug: "application/pug+html",
    bat: "application/x-bat",
    deb: "application/vnd.debian.binary-package"
  };

  function dropZone(element, options) {
    var ret = {
      element: element
    },
        input;

    if (!window.File) {
      throw new Error('Files are not supported by this browser! - Dropping won\'t work!');
    }

    function onDragOver(e) {
      if (e.dataTransfer.types.indexOf('Files') == -1) return;
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      element.classList.add('state-hover');
      if (typeof options.onDragOver == 'function') options.onDragOver.call(this, e);
    }

    function onDragEnter(e) {
      if (e.dataTransfer.types.indexOf('Files') == -1) return;
      element.classList.add('state-hover');
      if (typeof options.onDragEnter == 'function') options.onDragEnter.call(this, e);
    }

    function onDragleave(e) {
      if (e.dataTransfer.types.indexOf('Files') == -1) return;
      element.classList.remove('state-hover');
      if (typeof options.onDragLeave == 'function') options.onDragLeave.call(this, e);
    }

    function onDragDrop(e) {
      var files;
      e.stopPropagation();
      e.preventDefault();
      element.classList.remove('state-hover'); // handle both drop and input selection

      var fileList = e.target.files || e.dataTransfer.files;
      if (fileList.length == 0) return;

      if (options.limit !== undefined && options.limit > -1) {
        if (fileList.length > options.limit && typeof options.onFileDiscard == 'function') {
          options.onFileDiscard(Array.prototype.slice.call(fileList, options.limit));
        }

        fileList = Array.prototype.slice.call(fileList, 0, options.limit);
      }

      files = processFileList(fileList);
      if (typeof options.callback == 'function') options.callback.call(element, files);
    }

    input = document.createElement('input');
    input.type = "file";
    input.multiple = options.limit !== 1;
    input.addEventListener('change', onDragDrop, false);

    if (options.clickable) {
      element.classList.add('dropzone-clickable');
      element.addEventListener('click', function () {
        input.click();
      }, false);
    }

    ret.input = input;

    ret.openDialog = function () {
      input.click();
    };

    element.addEventListener('dragover', onDragOver, false);
    element.addEventListener('dragenter', onDragEnter, false);
    element.addEventListener('dragend', onDragleave, false);
    element.addEventListener('dragleave', onDragleave, false);
    element.addEventListener('drop', onDragDrop, false);
    return ret;
  }

  function processFileList(files) {
    var out = [];

    var _loop = function _loop(i) {
      var file = files[i],
          extension = file.name.match(/\.([^.]+$)/);

      if (extension == null) {
        extension = "";
      } else {
        extension = extension[1];
      }

      var filetype = customMimes[extension] || file.type;
      out.push({
        file: file,
        lastModified: file.lastModifiedDate,
        size: bytesToString(file.size),
        name: file.name,
        type: filetype,
        read: function read() {
          var as = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'text';
          var encoding = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'utf8';
          return new Promise(function (res, rej) {
            try {
              var reader = new FileReader();

              reader.onload = function (e) {
                res(e.target.result);
              };

              reader.onerror = function (e) {
                var error;

                switch (e.target.error.code) {
                  case e.target.error.NOT_FOUND_ERR:
                    error = {
                      message: 'File not found!',
                      data: e
                    };
                    break;

                  case e.target.error.NOT_READABLE_ERR:
                    error = {
                      message: 'File not readable!',
                      data: e
                    };
                    break;

                  case e.target.error.ABORT_ERR:
                    error = {
                      message: 'File reading aborted!',
                      data: e
                    };
                    break;

                  default:
                    error = {
                      message: 'Error reading file!',
                      data: e
                    };
                }

                ;
                rej(error);
              };

              switch (as.toLowerCase()) {
                case 'text':
                case 'string':
                  reader.readAsText(file, encoding);
                  break;

                case 'dataurl':
                case 'url':
                  reader.readAsDataURL(file);
                  break;

                case 'binarystring':
                case 'binary':
                  reader.readAsBinaryString(file);
                  break;

                case 'arraybuffer':
                case 'buffer':
                  reader.readAsArrayBuffer(file);
                  break;

                default:
                  rej({
                    message: 'Unknown type "' + as + '"!'
                  });
              }
            } catch (e) {
              rej({
                message: 'FileReader API not supported!',
                data: e
              });
            }
          });
        }
      });
    };

    for (var i = 0; i < files.length; i++) {
      _loop(i);
    }

    return out;
  }

  function bytesToString(b) {
    var step = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024;
    var i = 0,
        i_max = sizes.length - 1;

    while (b / step >= 1 && i < i_max) {
      b = b / step;
      i++;
    }

    b = b.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
    return {
      long: b + " " + sizes[i] + 'byte' + (b == '1' ? '' : 's'),
      short: b + " " + sizes_s[i]
    };
  }

  return {
    dropZone: dropZone,
    bytesToString: bytesToString
  };
});