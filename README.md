Expectation Parser
==================

Step 1: Write EBNF.

Step 2: Write Javascript.

Step 3: Hold EBNF in originai position, move Javascript up and down.

Step 3: Now you can parse anything.*

> *Hah hah now try XML.

A simple parser that's not so much a parser as a set of functions you can rig up into a parser to convert a bunch of tokens into a tree like thing which is easier to process than a flat stream of tokens.  With these functions you can write rudimentary non-predictive RD parsers for many things described in EBNF, and in fact the functions provided mirror exactly the major structures in EBNF.  They will also have all the problems that naively written non-predictive RD parsers have, but hey that's life.

These functions do not have any provisions for streaming input, although you could probably come up with one at one or two levels at the top.  (Or more!)

Also, you can do XML, it just requires a couple more lines of code that don't involve these here functions to check tag names.  But there are other things that require a bit (a lot) more legwork to parse.



Usage
-----

Stick in an array of tokens in the form of `{ type: 'tokenType', value: 'optional value here' }` and get back a bunch of Productions.  Create your run time objects from the Productions and have fun.

> Note that the Special Sequence thingy in EBNF isn't directly supported because you can just use regexes anyway.  In fact, terminals are evaluated with regexes.

Recall those steps at the top, that's basically how to use this.  If you find EBNF insufficient because for some reason you need to write in insidiously slow C++ parser in JS, you can probably use these functions to help in some way, but may just need to use something else because C++ is a funny beast.  C is, too, come to that, but at least it doesn't have templates.

### API

```js
var expect = require( 'simple-parser' );
```

#### alternation

```
expect.alternation( alternateExpectations :Array, tokens :Array ) :AnonymousProduction | null
expect.alternation( alternateExpectations :Array ) :(Function( tokens :Array ) :AnonymousProduction | null)
```

This corresponds to Alternation in EBNF, where items are separated by pipes. (`|`)

- `alternateExpectations` Array - An array of different expectations, each tried one after the other until one yields a Production from the current array of tokens.  The first one to match has its Production returned regardless of how many tokens that Production consumes.
- `tokens` Array - The tokens to test against this expectation.  Calling `expect.alternation` without this argument will return a curried function which will later accept this argument, yielding the expected Production or Null.

#### repetition

```
expect.repetition( repeatedExpectation :Function, tokens :Array ) :AnonymousProduction
expect.repetition( repeatedExpectation :Function ) :(Function( tokens :Array ) :AnonymousProduction)
```

Corresponds to Repetition in EBNF, where an item or sequence of items is repeated zero or more times.  Note that this means `expect.repetition` will always return a Production, even if that Production is empty.

- `repeatedExpectation` Function - An expectation that is repeated as many times as possible, the repetitions all combined into one single Production returned by `repetition`.  To repeat a Sequence, pass in a curried function returned by `expect.sequence`.
- `tokens` Array - The tokens to test against this expectation.  Calling `expect.repetition` without this argument will return a curried function which will later accept this argument, yielding the expected Production.

#### optional

```
expect.optional( optionalExpectation :Function, tokens :Array ) :AnonymousProduction
expect.optional( optionalExpectation :Function ) :(Function( tokens :Array ) :AnonymousProduction)
```

Corresponds to Optionality in EBNF, where an item or sequence of items is either present one time or absent.  Note that this means `expect.repetition` will always return a Production, even if that Production is empty.

- `optionalExpectation` Function - An expectation that is tried and, if it doesn't yield a Production, results in `optional` yielding an empty Production.  To treat a Sequence as Optional, pass in a curried function returned by `expect.sequence`.
- `tokens` Array - The tokens to test against this expectation.  Calling `expect.optional` without this argument will return a curried function which will later accept this argument, yielding the expected Production.

#### sequence

```
expect.sequence( expectationsInSequence :Array, tokens :Array ) :AnonymousProduction | null
expect.sequence( expectationsInSequence :Array ) :(Function( tokens :Array ) :AnonymousProduction | null)
```

Corresponds to a concatenated sequence of productions in EBNF.

- `expectationsInSequence` Array - Expectations (Functions) that should consume the tokens in order of their place in the array.  All items in the array must yield a Production or else `expect.sequence` yields `null`.
- `tokens` Array - The tokens to test against this expectation.  Calling `expect.sequence` without this argument will return a curried function which will later accept this argument, yielding the expected Production or Null.

#### terminal

```
expect.sequence( tokenSpec :Object, tokens :Array ) :TerminalProduction | null
expect.sequence( tokenSpec :Object ) :(Function( tokens :Array ) :TerminalProduction | null)
```

Corresponds roughly with the idea of a Terminal in EBNF.  `expect.terminal` explicitly returns either a `TerminalProduction` or `null` to distinguish such Productions from others.

- `tokenSpec` Object | String | Regexp | Function - An item against which a single token is tested.  The behavior is slightly different based on what is passed in:
	- Object - A plain object with 1 or 2 properties:
		- `type` String - The type of token expected.  Must match exactly to the `type` that the token has.  Not tested if not present.
		- `value` String | Regexp - If present, the `value` of the token is compared to this, either by equality (String) or testing against. (Regexp)
	- String - Strings are directly compared against the token's `value`.
	- Regexp - Strings are tested by the Regexp.
	- Function - The function is passed the token and should return a truthy or falsy value indicating whether or not it accepts that token.  (Tokens are in the form of at least {type:String, value:String}.)
- `tokens` Array - The tokens to test against this expectation.  Calling `expect.terminal` without this argument will return a curried function which will later accept this argument, yielding the expected Production or Null.

#### productions.Production

#### productions.AnonymousProduction

#### productions.TerminalProduction



Examples
--------

```js
// sum = product, { ( add | subtract ), product };
// product = number, { ( multiple | divide ), number };

// Notice how these are only called with a token spec, and not with an array of tokens.
var expectNumber = expect.terminal({ type: 'number' });
var expectAdd = expect.terminal({ type: 'operation', value: '+' });
var expectSubtract = expect.terminal({ type: 'operation', value: '-' });
var expectMultiply = expect.terminal({ type: 'operation', value: '*' });
var expectDivide = expect.terminal({ type: 'operation', value: '/' });

var expectAdditive = expect.alternation([ expectAdd, expectSubtract ]);
var expectMultiplicative = expect.alternation([ expectMultiply, expectDivide ]);

function expectSum( tokens ) {
	var production = expect.sequence([
		expectProduct,
		expect.repetition( expect.sequence([
			expectAdditive,
			expectProduct
		]))
	], tokens );
	// notice that expect.sequence here is called with `tokens`.

	if( production ) {
		return new productions.Production( 'sum', production.contents );
	}

	// The normal behavior is to return null when the rule does not match.
	// You may do other things, too, like throw exceptions.
	return null;
}

function expectProduct( tokens ) {
	var production = expect.sequence([
		expectNumber,
		expect.repetition( expect.sequence([
			expectMultiplicative,
			expectNumber
		]))
	], tokens );

	if( production ) {
		return new productions.Production( 'product', production.contents );
	}

	return null;
}
```



Things Yet To Do
----------------

- Some sort of function that works like the "exception" symbol would probably be useful, but it might produce nicer end products if you have a separate rule for that.  Maybe.  Maybe not.



Why?!
-----

I wanted something small that did what I needed and didn't depend on any of Node's built in modules.

Also I was bored and wanted to learn about parsing in a more general sense, and also I was writing a domain specific language for reasons.



License
-------

MIT.
