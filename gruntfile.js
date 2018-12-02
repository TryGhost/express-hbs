module.exports = function configureGrunt(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    mochacli: {
      options: {
        ui: 'bdd',
        reporter: 'spec'
      },

      all: {
        src: ['test/*.js']
      }
    }
  });

  grunt.registerTask('setProductionEnv', function () {
    // Use 'production' config
    process.env.NODE_ENV = 'production';
  });

  grunt.loadNpmTasks('grunt-mocha-cli');

  // Run tests
  grunt.registerTask('default', ['mochacli:all', 'setProductionEnv', 'mochacli:all']);
};
