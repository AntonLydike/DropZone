/**
 * DropZone (no upload) COPYRIGHT (c) by Anton Lydike
 * v1.0.0
 *
 * https://github.com/AntonLydike/DropZone
 */
// This is the source file, from this all version will be built.
;(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  global.DropZone = (
    ({dropZone, bytesToString}) => {
      dropZone.bytesToString = bytesToString;
      return dropZone}
    )(factory())
})(window, () => {
  let sizes   = ['', 'Kilo', 'Mega', 'Giga', 'Tera', 'Peta', 'Exa', 'Zetta', 'Yotta'],
      sizes_s = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      customMimes = {
        php:"application/x-php",
        less:"application/less+css",
        sass:"application/sass+css",
        babel:"application/babel+js",
        coffee:"application/vnd.coffeescript",
        jade:"application/jade+html",
        pug:"application/pug+html",
        bat: "application/x-bat",
        deb: "application/vnd.debian.binary-package"
      };

  function dropZone (element, options) {
    let ret = {element}, input;

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

    function onDragEnter (e) {
      if (e.dataTransfer.types.indexOf('Files') == -1) return;
      element.classList.add('state-hover');
      if (typeof options.onDragEnter == 'function') options.onDragEnter.call(this, e);
    }

    function onDragleave (e) {
      if (e.dataTransfer.types.indexOf('Files') == -1) return;
      element.classList.remove('state-hover');
      if (typeof options.onDragLeave == 'function') options.onDragLeave.call(this, e);
    }

    function onDragDrop(e) {
      let files;

      e.stopPropagation();
      e.preventDefault();
      element.classList.remove('state-hover');

      // handle both drop and input selection
      let fileList = e.target.files || e.dataTransfer.files;

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

      element.addEventListener('click', () => {
        input.click();
      }, false)
    }

    ret.input = input;
    ret.openDialog = () => {
      input.click();
    }

    element.addEventListener('dragover', onDragOver, false);
    element.addEventListener('dragenter', onDragEnter, false);
    element.addEventListener('dragend', onDragleave, false);
    element.addEventListener('dragleave', onDragleave, false);
    element.addEventListener('drop', onDragDrop, false);

    return ret;
  }

  function processFileList (files) {
    let out = [];
    for(let i = 0; i < files.length; i++) {
      let file = files[i],
          extension = file.name.match(/\.([^.]+$)/)

      if (extension == null) {
        extension = "";
      } else {
        extension = extension[1];
      }

      let filetype = customMimes[extension] || file.type;

      out.push({
        file,
        lastModified: file.lastModifiedDate,
        size: bytesToString(file.size),
        name: file.name,
        type: filetype,
        read(as = 'text', encoding = 'utf8') {
          return new Promise((res, rej) => {
            try {
              let reader = new FileReader();

              reader.onload = (e) => {
                res(e.target.result);
              }
              reader.onerror = (e) => {
                let error;
                switch(e.target.error.code) {
                  case e.target.error.NOT_FOUND_ERR:
                    error = {message: 'File not found!', data: e};
                    break;
                  case e.target.error.NOT_READABLE_ERR:
                    error = {message: 'File not readable!', data: e};
                    break;
                  case e.target.error.ABORT_ERR:
                    error = {message: 'File reading aborted!', data: e};
                    break;
                  default:
                    error = {message: 'Error reading file!', data: e};
                };

                rej(error);
              }

              switch(as.toLowerCase()) {
                case 'text':
                case 'string':
                  reader.readAsText(file, encoding)
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
                  rej({message: 'Unknown type "' + as + '"!'});
              }

            } catch (e) {
              rej({message: 'FileReader API not supported!', data: e});
            }
          })
        }
      })
    }
    return out;
  }

  function bytesToString(b, step = 1024) {
    let i = 0,
    i_max = sizes.length - 1;

    while (b / step >= 1 && i < i_max) {
      b = b/step;
      i++;
    }

    b = b.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
    return {
      long: b + " " + sizes[i] + 'byte' + (b == '1' ? '' : 's'),
      short: b + " " + sizes_s[i]
    };
  }

  return {dropZone, bytesToString};
});
