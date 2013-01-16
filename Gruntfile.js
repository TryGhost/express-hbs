var os = require('os');
var platform = os.platform();
var isWindows = platform.indexOf('win') === 0;
var isLinux = platform === 'linux';
var Path = require('path')


module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-simple-mocha');

  grunt.initConfig({
    simplemocha: {
      all: {
        src: 'tests/**/*Specs.js'
      }
    }
  });

  // Runs tests by default.
  grunt.registerTask('default', 'simplemocha');
};
