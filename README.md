# DropZone
A simple js DropZone package with no upload functionality

## Usage

### Basic Usage: `handle = DropZone(node, options);`

````js
const elm = document.querySelector('#dropzone');

const handle = DropZone(elm, {
  callback(files) {
    console.log(files);
  },
  clickable: true // make the zone clickable for a file dialog
})

// later
handle.openDialog();
// handle.element holds elm
````

### Options:

|option          |type             | description |
|----------------|-----------------|-------------|
|callback        |`function(files)`| Callback function with a list of files|
|onFileDiscard   |`function(files)`| `[optional]` called with the discarded files, if a limit was set|
|limit           |`integer`        | `[default: -1]` Limit to number of files that can be submitted|
|clickable       |`boolean`| `[default: false]` Enables clicking to open the file dialog|
|onDragEnter     |`function(event)`| `[optional]` callback for drag event|
|onDragOver      |`function(event)`| `[optional]` callback for drag event|
|onDragLeave     |`function(event)`| `[optional]` callback for drag event|

### File list
Each object in the file list (passed to `callback` and `onFileDiscard`) has the following fields:

 - `name` File name
 - `size: {long, short}` File size as strings, in long format ("32 megabytes") and short ("32 MB")
 - `lastModified` Unix timestamp for last modification date
 - `type` Mime type of file (determined by OS, with some additions by DropZone.js)
 - `file` The original file object
 - `read(as = 'text', encoding = 'utf8')` Returns a promise containing file contents read as:
   - `text` (or `string`) text
   - `dataurl` (or `url`) as a data url
   - `binarystring` (or `binary`) string containing original bytes (no encoding)
   - `arraybuffer` (or `buffer`) Array Buffer

## CSS

To enable easy css-integration, these classes are added:

 - `dropzone-clickable` is added, when set clickable is set in the options.
 - `state-hover` is added, when a file is dragged above it.

## Converting bytes to strings

`DropZone.bytesToString(bytes, base = 1024)` Converts bytes to readable string
````js
let size = DropZone.bytesToString(123456);

console.log(size); // => {long: "120.56 Kilobytes", short: "120.56 kB"}
````

If you want to calculate the size to base 1000 instead, use:
````js
let size = DropZone.bytesToString(123456, 1000);

console.log(size); // => {long: "123.45 Kilobytes", short: "123.45 kB"}
````
