/*!
 * RegJSGen
 * Copyright 2014 Benjamin Tan <https://d10.github.io/>
 * Available under MIT license <http://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object` */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object */
  var oldRoot = root;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /*! Based on http://mths.be/fromcodepoint v0.2.0 by @mathias */

  var stringFromCharCode = String.fromCharCode;
  var floor = Math.floor;
  function fromCodePoint() {
    var MAX_SIZE = 0x4000;
    var codeUnits = [];
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    var result = '';
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (
        !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
        codePoint < 0 || // not a valid Unicode code point
        codePoint > 0x10FFFF || // not a valid Unicode code point
        floor(codePoint) != codePoint // not an integer
      ) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        // BMP code point
        codeUnits.push(codePoint);
      } else {
        // Astral code point; split in surrogate halves
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
      if (index + 1 == length || codeUnits.length > MAX_SIZE) {
        result += stringFromCharCode.apply(null, codeUnits);
        codeUnits.length = 0;
      }
    }
    return result;
  }


  /*--------------------------------------------------------------------------*/

  function generate(node) {
    return getGenerator(node.type)(node);
  }

  function getGenerator(type) {
    if (generate.hasOwnProperty(type)) {
      return generate[type];
    }

    throw Error('Invalid node type: ' + type);
  }

  /*--------------------------------------------------------------------------*/

  function generateAlternative(node) {
    var type = node.type;

    if (!/^(?:alternative|empty)/.test(type)) {
      throw Error('Invalid node type: ' + type);
    }

    if (type == 'empty') {
      return '';
    }

    var terms = node.terms,
        length = terms ? terms.length : 0;

    if (length == 0) {
      throw Error('No terms');
    } else if (length == 1) {
      return generateTerm(terms[0]);
    } else {
      var i = -1,
          result = '';

      while (++i < length) {
        result += generateTerm(terms[i]);
      }

      return result;
    }
  }

  function generateAssertion(node) {
    var type = node.type;

    if (type != 'assertion') {
      throw Error('Invalid node type: ' + type);
    }

    switch (node.name) {
      case 'start':
        return '^';
      case 'end':
        return '$';
      case 'boundary':
        return '\\b';
      case 'not-boundary':
        return '\\B';
      default:
        throw Error('Invalid assertion');
    }
  }

  function generateAtom(node) {
    var type = node.type;

    if (!/^(?:assertion|character|characterClass|dot|escape|escapeChar|group|ref)$/.test(type)) {
      throw Error('Invalid node type: ' + type);
    }

    return getGenerator(type)(node);
  }

  function generateCharacter(node) {
    var type = node.type;

    if (type != 'character') {
      throw Error('Invalid node type: ' + type);
    }

    return fromCodePoint(node.codePoint);
  }

  function generateCharacterClass(node) {
    var type = node.type;

    if (type != 'characterClass') {
      throw Error('Invalid node type: ' + type);
    }

    var classRanges = node.classRanges,
        length = classRanges ? classRanges.length : 0;

    if (length == 0) {
      throw Error('No class ranges');
    }

    var i = -1,
        result = '[';

    if (node.negative) {
      result += '^';
    }

    while (++i < length) {
      result += generateClassAtom(classRanges[i]);
    }

    result += ']';

    return result;
  }

  function generateCharacterClassRange(node) {
    var type = node.type;

    if (type != 'characterClassRange') {
      throw Error('Invalid node type: ' + type);
    }

    var min = node.min,
        max = node.max;

    if (min.type == 'characterClassRange' || max.type == 'characterClassRange') {
      throw Error('Invalid character class range');
    }

    return generateClassAtom(min) + '-' + generateClassAtom(max);
  }

  function generateClassAtom(node) {
    var type = node.type;

    if (!/^(?:assertion|character|characterClassRange|dot|escape|escapeChar)$/.test(type)) {
      throw Error('Invalid node type: ' + type);
    }

    return getGenerator(type)(node);
  }

  function generateDisjunction(node) {
    var type = node.type;

    if (!/^(?:disjunction|alternative)$/.test(type)) {
      throw Error('Invalid node type: ' + type);
    }

    if (type == 'alternative') {
      return generateAlternative(node);
    }

    var alternatives = node.alternatives,
        length = alternatives ? alternatives.length : 0;

    if (length == 0) {
      throw Error('No alternatives');
    } else if (length == 1) {
      return generateAlternative(alternatives[0]);
    } else {
      var i = -1,
          result = '';

      while (++i < length) {
        if (i != 0) {
          result += '|';
        }
        result += generateAlternative(alternatives[i]);
      }

      return result;
    }
  }

  function generateDot(node) {
    var type = node.type;

    if (type != 'dot') {
      throw Error('Invalid node type: ' + type);
    }

    return '.';
  }

  function generateEmpty(node) {
    var type = node.type;

    if (type != 'empty') {
      throw Error('Invalid node type: ' + type);
    }

    return '';
  }

  function generateEscape(node) {
    var type = node.type;

    if (type != 'escape') {
      throw Error('Invalid node type: ' + type);
    }

    var name = node.name,
        codePoint = node.codePoint;

    switch (name) {
      case 'unicode':
        return '\\u' + ('0000' + codePoint.toString(16).toUpperCase()).slice(-4);
      case 'codePoint':
        return '\\u{' + codePoint.toString(16).toUpperCase() + '}';
      case 'controlLetter':
        return '\\c' + fromCodePoint(codePoint);
      case 'identifier':
      case 'octal':
        return '\\' + fromCodePoint(codePoint);
      case 'hex':
        return '\\x' + ('00' + codePoint.toString(16).toUpperCase()).slice(-2);
      case 'null':
        return '\\0';
      default:
        throw Error('Unsupported node escape name: ' + node.name);
    }
  }

  function generateEscapeChar(node) {
    var type = node.type;

    if (type != 'escapeChar') {
      throw Error('Invalid node type: ' + type);
    }

    return '\\' + node.value;
  }

  function generateGroup(node) {
    var type = node.type;

    if (type != 'group') {
      throw Error('Invalid node type: ' + type);
    }

    var result = '(';

    switch (node.behavior) {
      case 'normal':
        break;
      case 'ignore':
        result += '?:';
        break;
      case 'lookahead':
        result += '?=';
        break;
      case 'negativeLookahead':
        result += '?!';
        break;
      default:
        throw Error('Invalid behaviour: ' + node.behaviour);
    }

    result += generateDisjunction(node.disjunction) + ')';

    return result;
  }

  function generateQuantifier(node) {
    var type = node.type;

    if (type != 'quantifier') {
      throw Error('Invalid node type: ' + type);
    }

    var quantifier = '',
        min = node.min,
        max = node.max;

    switch (max) {
      case null:
        switch (min) {
          case 0:
            quantifier = '*'
            break;
          case 1:
            quantifier = '+';
            break;
          default:
            quantifier = '{' + min + ',}';
            break;
        }
        break;
      default:
        if (min == max) {
          quantifier = '{' + min + '}';
        }
        else if (min == 0 && max == 1) {
          quantifier = '?';
        } else {
          quantifier = '{' + min + ',' + max + '}';
        }
        break;
    }

    if (!node.greedy) {
      quantifier += '?';
    }

    return generateAtom(node.child) + quantifier;
  }

  function generateRef(node) {
    var type = node.type;

    if (type != 'ref') {
      throw Error('Invalid node type: ' + type);
    }

    return '\\' + node.ref;
  }

  function generateTerm(node) {
    var type = node.type;

    if (!/^(?:assertion|character|characterClass|dot|empty|escape|escapeChar|group|quantifier|ref)$/.test(type)) {
      throw Error('Invalid node type: ' + type);
    }

    return getGenerator(type)(node);
  }

  /*--------------------------------------------------------------------------*/

  generate.alternative = generateAlternative;
  generate.assertion = generateAssertion;
  generate.character = generateCharacter;
  generate.characterClass = generateCharacterClass;
  generate.characterClassRange = generateCharacterClassRange;
  generate.disjunction = generateDisjunction;
  generate.dot = generateDot;
  generate.empty = generateEmpty;
  generate.escape = generateEscape;
  generate.escapeChar = generateEscapeChar;
  generate.group = generateGroup;
  generate.quantifier = generateQuantifier;
  generate.ref = generateRef;

  /*--------------------------------------------------------------------------*/

  // export regjsgen
  // some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // define as an anonymous module so, through path mapping, it can be aliased
    define(function() {
      return {
        'generate': generate
      };
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Narwhal, Node.js, Rhino -require, or RingoJS
    freeExports.generate = generate;
  }
  // in a browser or Rhino
  else {
    root.regjsgen = {
      'generate': generate
    };
  }
}.call(this));
