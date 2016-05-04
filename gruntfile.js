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
    },

    release: {
      github: {
        repo: 'barc/express-hbs',
        accessTokenVar: 'GITHUB_ACCESS_TOKEN'
      }
    }
  });

  grunt.registerTask('setProductionEnv', function () {
    // Use 'production' config
    process.env.NODE_ENV = 'production';
  });

  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-release');

  // Run tests
  grunt.registerTask('default', ['mochacli:all', 'setProductionEnv', 'mochacli:all']);
};
