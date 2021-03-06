'use strict';

var fs = require('fs');
var ph = require('path');
var zlib = require('zlib');
var padding = 120;

function Backup() {
	this.file = [];
	this.directory = [];
	this.path = '';
	this.fileName = '';

	this.read = { key: '', value: '', status: 0 };

	this.complete = function() {};
	this.filter = function(path) {
		return true;
	};
}

function Walker() {
	this.pending = [];
	this.pendingDirectory = [];
	this.directory = [];
	this.file = [];
	this.options = { sort: true, addEmptyDirectory: false };
	this.onComplete = null;
	this.onFilter = null;
}

Walker.prototype.reset = function() {
	var self = this;
	self.file = [];
	self.directory = [];
	self.pendingDirectory = [];
};

Walker.prototype.walk = function(path) {

	var self = this;

	if (path instanceof Array) {
		var length = path.length;

		for (var i = 0; i < length; i++)
			self.pendingDirectory.push(path[i]);

		self.next();
		return;
	}

	fs.readdir(path, function(err, arr) {

		if (err)
			return self.next();

		if (arr.length === 0 || self.options.addEmptyDirectory) {
			if (self.onFilter === null || self.onFilter(path))
				self.directory.push(path);
		}

		var length = arr.length;
		for (var i = 0; i < length; i++)
			self.pending.push(ph.join(path, arr[i]));

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
		else if (self.onFilter === null || self.onFilter(path))
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

	if (self.options.sort) {
		self.file.sort(function(a, b) {
			return a.localeCompare(b);
		});
	}

	self.onComplete(self.directory, self.file);
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

	walker.onComplete = function(directory, files) {
		self.directory = directory;
		self.file = files;
		self.$compress();
	};

	walker.walk(path);
};


Backup.prototype.$compress = function() {

	var self = this;
	var length = self.path.length;
	var len = 0;

	if (self.directory.length > 0) {

		len = self.directory.length;

		for (var i = 0; i < len; i++) {
			var o = self.directory[i];
			if (self.filter(o.substring(length)))
				fs.appendFileSync(self.fileName, (o.replace(self.path, '').replace(/\\/g, '/') + '/').padRight(padding) + ':#\n');
		}

		self.directory = [];
	}

	var fileName = self.file.shift();

	if (typeof(fileName) === 'undefined') {
		self.complete(null, self.fileName);
		return;
	}

	if (!self.filter(fileName.substring(length))) {
		self.$compress();
		return;
	}

	var buffer = '';

	fs.readFile(fileName, function(err, data) {
		zlib.gzip(data, function(err, data) {

			if (err)
				return;

			var name = fileName.replace(self.path, '').replace(/\\/g, '/');
			fs.appendFile(self.fileName, name.padRight(padding) + ':' + data.toString('base64') + '\n', function(err) {
				self.$compress();
			});
		});
	});
};

Backup.prototype.restoreKey = function(data) {

	var self = this;
	var read = self.read;

	if (read.status === 1) {
		self.restoreValue(data);
		return;
	}

	var index = data.indexOf(':');

	if (index === -1) {
		read.key += data;
		return;
	}

	read.status = 1;
	read.key = data.substring(0, index);
	self.restoreValue(data.substring(index + 1));
};

Backup.prototype.restoreValue = function(data) {

	var self = this;
	var read = self.read;

	if (read.status !== 1) {
		self.restoreKey(data);
		return;
	}

	var index = data.indexOf('\n');
	if (index === -1) {
		read.value += data;
		return;
	}

	read.value += data.substring(0, index);
	self.restoreFile(read.key.replace(/\s/g, ''), read.value.replace(/\s/g, ''));

	read.status = 0;
	read.value = '';
	read.key = '';

	self.restoreKey(data.substring(index + 1));
};

Backup.prototype.restore = function(filename, path, callback, filter) {

	if (!fs.existsSync(filename)) {
		if (callback)
			callback(new Error('Backup file not found.'), path);
		return;
	}

	var self = this;
	self.filter = filter;
	self.createDirectory(path, true);

	var stream = fs.createReadStream(filename);
	var key = '';
	var value = '';
	var status = 0;

	self.path = path;

	stream.on('data', function(buffer) {

		var data = buffer.toString('utf8');
		self.restoreKey(data);

	});

	if (callback) {
		stream.on('end', function() {
			callback(null, path);
			stream = null;
		});
	}

	stream.resume();
};

Backup.prototype.restoreFile = function(key, value) {
	var self = this;

	if (typeof(self.filter) === 'function' && !self.filter(key))
		return;

	if (value === '#') {
		self.createDirectory(key);
		return;
	}

	var path = key;
	var index = key.lastIndexOf('/');

	if (index !== -1) {
		path = key.substring(0, index).trim();
		if (path.length > 0)
			self.createDirectory(path);
	}

	var buffer = new Buffer(value, 'base64');
	zlib.gunzip(buffer, function(err, data) {
		fs.writeFileSync(ph.join(self.path, key), data);
		buffer = null;
	});
};

Backup.prototype.createDirectory = function(path, root) {

	if (path[0] === '/')
		path = path.substring(1);

	if (path[path.length - 1] === '/')
		path = path.substring(0, path.length - 1);

	var arr = path.split('/');
	var directory = '';
	var self = this;
	var length = arr.length;

	for (var i = 0; i < length; i++) {

		var name = arr[i];
		directory += (directory.length > 0 ? '/' : '') + name;
		var dir = ph.join(self.path, directory);

		if (root)
			dir = '/' + dir;

		if (fs.existsSync(dir))
			continue;

		fs.mkdirSync(dir);
	}
};

Backup.prototype.clear = function(path, callback, filter) {

	var self = this;
	var walker = new Walker();
	walker.options.addEmptyDirectory = true;

	if (callback)
		self.complete = callback;

	if (filter)
		self.filter = filter;

	walker.onComplete = function(directory, files) {

		self.file = [];
		self.directory = [];

		if (typeof(filter) !== 'function')
			filter = function(o) { return true; };

		var length = files.length;

		for (var i = 0; i < length; i++) {
			var o = files[i];
			if (filter(o))
				self.file.push(o);
		}

		length = directory.length;
		for (var i = 0; i < length; i++) {

			var o = files[i];

			if (o === path)
				return;

			if (filter(o))
				self.directory.push(o);
		}

		self.directory.sort(function(a, b) {
			if (a.length < b.length)
				return 1;
			else
				return -1;
		});

		self.removeFile();
	};

	walker.walk(path);
};

Backup.prototype.removeFile = function() {

	var self = this;
	var filename = self.file.shift();

	if (typeof(filename) === 'undefined') {
		self.removeDirectory();
		return;
	}

	fs.unlink(filename, function() {
		self.removeFile();
	});
};

Backup.prototype.removeDirectory = function() {

	var self = this;
	var directory = self.directory.shift();

	if (typeof(directory) === 'undefined') {
		self.complete();
		return;
	}

	fs.rmdir(directory, function() {
		self.removeDirectory();
	});
};

// ===========================================================================
// EXPORTS
// ===========================================================================

exports.backup = function(path, filename, callback, filter) {
	var backup = new Backup();
	backup.backup(path, filename, callback, filter);
};

exports.clear = function(path, callback, filter) {
	var backup = new Backup();
	backup.clear(path, callback, filter);
};

exports.restore = function(filename, path, callback, filter) {
	var backup = new Backup();
	backup.restore(filename, path, callback, filter);
};

exports.Walker = Walker;
exports.Backup = Backup;

if (typeof(String.prototype.padRight) === 'undefined') {
	String.prototype.padRight = function(max, c) {
		var self = this;
		return self + new Array(Math.max(0, max - self.length + 1)).join(c || ' ');
	};
}