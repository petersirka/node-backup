// Copyright Peter Širka, Web Site Design s.r.o. (www.petersirka.sk)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fs = require('fs');
var ph = require('path');
var zlib = require('zlib');

function Backup() {
	this.file = [];
	this.directory = [];
	this.path = '';
	this.fileName = '';

	this.complete = function() {};
	this.filter = function(path) {
		return true;
	};
};

function Walker() {
	this.pending = [];
	this.pendingDirectory = [];
	this.directory = [];
	this.file = [];
	this.complete = null;
};

Walker.prototype.walk = function(path) {
	var self = this;
	fs.readdir(path, function(err, arr) {

		if (err)
			return self.next();

		if (arr.length === 0)
			self.directory.push(path);

		arr.forEach(function(o) {
			self.pending.push(ph.join(path, o));
		});

		self.next();
	});
};

Walker.prototype.stat = function(path) {	
	var self = this;

	fs.stat(path, function(err, stats) {

		if (err)
			return self.next();

		if (stats.isDirectory())
			self.pendingDirectory.push(path);
		else
			self.file.push(path);

		self.next();
	});
};

Walker.prototype.next = function() {
	var self = this;

	if (self.pending.length > 0) {
		var item = self.pending.shift();
		self.stat(item);
		return;
	}

	if (self.pendingDirectory.length > 0) {
		var directory = self.pendingDirectory.shift();
		self.walk(directory);
		return;
	}

	self.file.sort(function(a, b) {
		return a.localeCompare(b);
	});

	self.complete(self.directory, self.file);
};


Backup.prototype.backup = function(path, fileName, callback, filter) {

	if (fs.existsSync(fileName))
		fs.unlinkSync(fileName);

	var walker = new Walker();
	var self = this;

	self.fileName = fileName;
	self.path = path;

	if (callback)
		self.complete = callback;

	if (filter)
		self.filter = filter;

	walker.complete = function(directory, files) {
		self.directory = directory;
		self.file = files;
		self.$compress();
	};

	walker.walk(path);
};

Backup.prototype.$compress = function() {

	var self = this;

	if (self.directory.length > 0) {
		
		self.directory.forEach(function(o) {
			if (self.filter(o))
				fs.appendFileSync(self.fileName, (o.replace(self.path, '') + '/').padRight(100) + ':#\n');
		});

		self.directory = [];
	}

	var fileName = self.file.shift();

	if (typeof(fileName) === 'undefined') {
		self.complete();
		return;
	}

	if (!self.filter(fileName)) {
		self.$compress();
		return;
	}

	var buffer = '';

	fs.readFile(fileName, function(err, data) {		
		zlib.gzip(data, function(err, data) {

			if (err)
				return;

			var name = fileName.replace(self.path, '');
			fs.appendFile(self.fileName, name.padRight(100) + ':' + data.toString('base64') + '\n', function(err) {
				self.$compress();
			});
		});
	});
};

/*
	@max {Number}
	@c {String} :: optional
	return {String}
*/
String.prototype.padLeft = function(max, c) {
	var self = this.toString();
	return Array(Math.max(0, max - self.length + 1)).join(c || ' ') + self;
};

/*
	@max {Number}
	@c {String} :: optional
	return {String}
*/
String.prototype.padRight = function(max, c) {
	var self = this.toString();
	return self + Array(Math.max(0, max - self.length + 1)).join(c || ' ');
};

// ===========================================================================
// EXPORST
// ===========================================================================

exports.backup = function(path, fileName, callback, filter) {
	var backup = new Backup();
	backup.backup(path, fileName, callback, filter);
};