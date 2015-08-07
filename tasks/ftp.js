'use strict';
var path = require('path');
var eachAsync = require('each-async');
var chalk = require('chalk');
var ftpLib = require('jsftp');

var JSFtp = require('jsftp-mkdirp')(ftpLib);

module.exports = function (grunt) {
	grunt.registerMultiTask('ftpPut', 'Upload files to an FTP-server', function () {
		var done = this.async();
		var options = this.options();
		var fileCount = 0;

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		eachAsync(this.files, function (el, i, next) {
			// have to create a new connection for each file otherwise they conflict
			var ftp = new JSFtp(options);
			var finalRemotePath = path.join('/', el.dest, el.src[0]);

			ftp.mkdirp(path.dirname(finalRemotePath), function (err) {
				if (err) {
					next(err);
					return;
				}

				var buffer = grunt.file.read(el.src[0], {encoding: null});

				ftp.put(buffer, finalRemotePath, function (err) {
					if (err) {
						next(err);
						return;
					}

					fileCount++;
					ftp.raw.quit();
					next();
				});
			});
		}, function (err) {
			if (err) {
				grunt.warn(err);
				done();
				return;
			}

			if (fileCount > 0) {
				grunt.log.writeln(chalk.green(fileCount, fileCount === 1 ? 'file' : 'files', 'uploaded successfully'));
			} else {
				grunt.log.writeln(chalk.yellow('No files uploaded'));
			}

			done();
		});
	});

	grunt.registerMultiTask('ftpGet', 'Download files from an FTP-server', function () {
		var done = this.async();
		var options = this.options();
		var fileCount = 0;

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		var ftp = new JSFtp(options);


		eachAsync(this.files, function (el, i, next) {
			// have to create a new connection for each file otherwise they conflict
			var ftp = new JSFtp(options);

			grunt.file.mkdir(path.dirname(el.dest));

			var finalLocalPath = el.dest;
			if (grunt.file.isDir(el.dest)) {
				// if dest is a directory we have to create a file with the source filename
				finalLocalPath = path.join(el.dest, path.basename(el.src[0]));
			}

			// retrieve the file
			ftp.get(el.src[0], finalLocalPath, function (err) {
				if (err) {
					next(err);
					return;
				}

				fileCount++;
				ftp.raw.quit();
				next();
			});
		}, function (err) {
			if (err) {
				grunt.warn(err);
				done();
				return;
			}

			if (fileCount > 0) {
				grunt.log.writeln(chalk.green(fileCount, fileCount === 1 ? 'file' : 'files', 'downloaded successfully'));
			} else {
				grunt.log.writeln(chalk.yellow('No files downloaded'));
			}

			done();
		});
	});

	grunt.registerMultiTask('ftpDownloadAll', 'Download all files from an FTP-server in a folder', function () {
		var done = this.async();
		var options = this.options();
		var fileCount = 0;

		if (options.host === undefined) {
			throw new Error('`host` required');
		}

		options.debugMode = true;

		var ftp = new JSFtp(options);
		var directory = (this.data && this.data.directory) || '';
		var target = (this.data && this.data.target) || '';

		var onComplete = function(err, res){

			var files = res && res.split && res.split('\r\n');

			if(!files.length) {
				console.log("No files found in directory '" + directory + "'");
				done();
				return;
			}

			var fileNames = [], fileName = [], parts = [];

			//add trailing slash
			var prefix = directory;
			if(directory){
				if(directory.lastIndexOf('/') !== directory.length) {
					prefix += '/';
				}
			}
			if(target) {
				if(target.lastIndexOf('/') !== target.length) {
					target += '/';
				}
			}

			for(var i=0; i<files.length; i++){
				parts = files[i].split(/\s+/);
				if(!parts.length || parts[1] !== '1') continue;//files only

				fileName = parts.slice(8).join(' ');
				fileNames.push({
					src: prefix + fileName,
					dest: target + fileName
				});
			}

			eachAsync(fileNames, function (el, i, next) {
				// have to create a new connection for each file otherwise they conflict
				var ftp = new JSFtp(options);

				grunt.file.mkdir(path.dirname(el.dest));

				var finalLocalPath = el.dest;
				if (grunt.file.isDir(el.dest)) {
					// if dest is a directory we have to create a file with the source filename
					finalLocalPath = path.join(el.dest, path.basename(el.src[0]));
				}

				// retrieve the file
				ftp.get(el.src, finalLocalPath, function (err) {
					if (err) {
						next(err);
						return;
					}

					fileCount++;
					ftp.raw.quit();
					next();
				});
			}, function (err) {
				if (err) {
					grunt.warn(err);
					done();
					return;
				}

				if (fileCount > 0) {
					grunt.log.writeln(chalk.green(fileCount, fileCount === 1 ? 'file' : 'files', 'downloaded successfully'));
				} else {
					grunt.log.writeln(chalk.yellow('No files downloaded'));
				}

				done();
			});
		}

		ftp.list(directory, onComplete.bind(this));
	});
};
