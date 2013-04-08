[![Backup & Restore](http://partialjs.com/exports/backup-logo.png)](https://github.com/petersirka/backup)

node.js Backup & Restore
========================

Easy Backup & Restore web site project. All files and directories are written to one file (and files are compressed via GZIP).

* Backup file is text file
* Supports backup and restore: files and directories
* Simple filtering files and directories
* Simple structure
* Easy manipulation
* Easy use in your project
* Executables *backup* and *restore* from terminal
* __No dependencies__

## Installation

```
$ sudo npm install -g backup

// or

$ npm install backup
```

## node.js

```js
var backup = require('backup');

/*
	Backup directory to file
	
	@directory {String}
	@filename {String},
	@complete {Function} :: optional, param: @err {Error}, @filename {String}
	@filter {Function} :: optional, param: @path {String} return TRUE | FALSE, if FALSE file or directory will be skipped
*/
backup.backup('/path/to/directory/', '/users/petersirka/desktop/website.backup');

/*
	Restore from file

	@filename {String},
	@directory {String}
	@complete {Function} :: optional, param: @err {Error}, @path {String}
	@filter {Function} :: optional, param: @path {String} return TRUE | FALSE, if FALSE file or directory will be skipped
*/
backup.restore('/users/petersirka/desktop/website.backup', '/path/to/directory/');
```

## BINARY

```
// backup current directory
// $ backup @filename
$ backup /users/petersirka/desktop/website.backup

// restore backup file
// $ restore @filename @path
$ restore /users/petersirka/desktop/website.backup /users/petersirka/desktop/
```

## The MIT License

Copyright (c) 2012-2013 Peter Širka <petersirka@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Recommend

[partial.js web application framework](https://github.com/petersirka/partial.js)

## Contact

[www.petersirka.sk](http://www.petersirka.sk)