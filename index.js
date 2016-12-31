const postcss = require('postcss');
const localByDefault = require('postcss-modules-local-by-default');
const extractImports = require('postcss-modules-extract-imports');
const scope = require('postcss-modules-scope');
const values = require('postcss-modules-values');
const colors = require('colors/safe');
const path = require('path');

const Parser = require('./parser');
const less = require('less');

class Core {
  constructor(plugins, opts) {
    this.plugins = plugins || Core.defaultPlugins;
    this.opts = opts || {};
  }

  load(sourceString, sourcePath, trace, pathFetcher ) {
      const that = this;
      return new Promise(function (resolve, reject) {     
        less.render(sourceString, { 
          // refactor below and add to opts !!!!!!!!
          paths: ['./node_modules/codemirror/lib', './node_modules/codemirror/theme'],
          rootFileInfo: { currentDirectory: path.dirname(sourcePath) } }, 
          function (e, output) {
            if (e) {
              return reject(`Less ${e.type} error in ${sourcePath} (${e.line}:${e.column}): ${e.message}`);
            }
            
            // do not modulesify raw css files
            if (sourcePath.endsWith(".css")) {
              return resolve({ injectableSource: output.css, exportTokens: {} });
            } 

            let parser = new Parser( pathFetcher, trace );
            var postcsstime = process.hrtime();
            resolve(
              postcss( that.plugins.concat( [parser.plugin] ) )
                .process(output.css, { from: "/" + sourcePath } )
                .then( result => {
                  if(that.opts.verbose) {
                    var hrend = process.hrtime(postcsstime);
                    console.log(`${colors.yellow("css-modulesify")}-${colors.magenta("PostCSS")}: ${colors.green(sourcePath)} -> ${ `${colors.cyan(hrend[1]/1000000)}ms` }}`);
                  }
                  return { injectableSource: result.css, exportTokens: parser.exportTokens };
                })
              );
          });
      });
  }
}

// These four plugins are aliased under this package for simplicity.
Core.values = values
Core.localByDefault = localByDefault
Core.extractImports = extractImports
Core.scope = scope

Core.defaultPlugins = [values, localByDefault, extractImports, scope]

module.exports = Core;