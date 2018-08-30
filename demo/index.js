var list = document.querySelector('.list');

DropZone(document.querySelector('.drop-zone'), {
  callback: function callback(files) {
    Array.prototype.forEach.call(files, function (file) {
      var li = document.createElement('li');
      li.innerHTML = '<b>' + file.name + '</b> - ' + file.size.short + ' <button>read text</button>';

      li.lastChild.addEventListener('click', function () {
        file.read('text').then(function (content) {
          alert(content);
        });
      });

      list.appendChild(li);

      // read text file:
      // file.read('dataurl').then((result) => {
      //   console.log(res);
      // })
    });
  },
  onDragEnter: function onDragEnter(e) {

  },
  onDragLeave: function onDragLeave(e) {

  },
  onDragOver: function onDragOver(e) {
  },
  onFileDiscard: function onFileDiscard(files) {
    // files is an array containing all discarded files (when a limit is set)
    console.log(files);
  },
  clickable: true, // open file dialog when the container element is clicked
  limit: -1 // file limit (-1 = no limit)
});
