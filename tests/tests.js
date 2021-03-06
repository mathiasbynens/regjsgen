var generate = require('../regjsgen').generate;
var parse = require('regjsparser').parse;

function runTests(data, excused, flags) {
  excused || (excused = []);
  flags || (flags = '');
  var keys = Object.keys(data).filter(function(name) {
    return data[name].type != 'error' && excused.indexOf(name) == -1;
  });
  keys.forEach(function(regex) {
    var node = data[regex],
        expected = JSON.stringify(regex),
        generated;
    try {
      generated = JSON.stringify(generate(node));
    } catch (error) {
      var isError = true,
          stack = error.stack;
      generated = JSON.stringify({
        name: error.name,
        message: error.message,
        input: regex
      });
    }

    if (generated !== expected && !isError) {
      try {
        generated = JSON.stringify(generate(node));
        expected = JSON.stringify(generate(parse(regex, flags)));
      } catch (error) {
        var stack = error.stack;
        generated = JSON.stringify({
          name: error.name,
          message: error.message,
          input: regex
        });
      }
    }

    if (generated !== expected) {
      console.log(
        [
          'FAILED TEST',
          'Failure generating regular expression: %s',
          'Generated: %s',
          'AST: %s'
        ].join('\n'),
        expected,
        generated,
        JSON.stringify(node)
      );
      if (stack) {
        console.log(stack);
      }
      process.exit(1);
    } else {
      console.log('PASSED TEST: ' + regex);
    }
  });
};

runTests(require('./test-data.json'));
runTests(require('./test-data-nonstandard.json'));
runTests(require('./test-data-unicode.json'), null, 'u');
