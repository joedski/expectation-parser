Short Tutorial
==============

### Step 1: Write EBNF

EBNF is nice because it presents a standard language for what your parser is looking for in a token stream.  Just for instance, suppose we wanted to write a simple calculator and, to make things easier, we'll evaluate everything from left to right, no order of operations.  We might start out with something like

```
expression = number, operator, number;
```

Which is sufficient for one operation, but doesn't handle repeating operations, so we'll add a bit of recursion.

```
expression = ( number | expression ), operator, ( number | expression );
```

Now it can recur.  However, we haven't defined what an operator is, nor what a number is.  While Regexps aren't EBNF, we'll just use them because we'll be reusing them later.  These are our *Terminals*.

```
number = /[0-9]+(\.[0-9]+)?/;
operator = /[\+\-\*\/]/;
expression = ( number | expression ), operator, ( number | expression );
```

### Step 2: Write Javascript

Now we can more or less translate this into Javascript.

```js
var expect = require( 'expect' );
var productions = require( 'expect/productions' );

function expectExpression( tokens ) {
	var production = expect.sequence([
		expect.alternation([
			expectNumber,
			expectExpression
		]),
		expectOperator,
		expect.alternation([
			expectNumber,
			expectExpression
		])
	], tokens );

	if( production ) {
		return new productions.Production( 'expression', production.contents );
	}
	else {
		return null;
	}
}

var expectNumber = expect.terminal({ type: 'number' });
var expectOperator = expect.terminal({ type: 'operator' });
```

That looks pretty good.  If we test it with the following array of tokens, we get the expected results.

```js
// from "1+2"
var tokens = [
	{ type: 'number', value: '1' },
	{ type: 'operator', value: '+' },
	{ type: 'number', value: '2' },
];

console.log( expectExpression( tokens ) );
```

which produces something like

```
Production {
	ruleName: 'expression', contents: [
		TerminalProduction { terminal: { type: 'number', value: '1' } },
		TerminalProduction { terminal: { type: 'operator', value: '+' } },
		TerminalProduction { terminal: { type: 'number', value: '2' } },
	]
}
```

So far so good.  How about more operations and numbers?

```js
// from "1+2-3"
var tokens = [
	{ type: 'number', value: '1' },
	{ type: 'operator', value: '+' },
	{ type: 'number', value: '2' },
	{ type: 'operator', value: '-' },
	{ type: 'number', value: '3' },
];

console.log( expectExpression( tokens ) );
```

```
Production {
	ruleName: 'expression', contents: [
		TerminalProduction { terminal: { type: 'number', value: '1' } },
		TerminalProduction { terminal: { type: 'operator', value: '+' } },
		TerminalProduction { terminal: { type: 'number', value: '2' } },
	]
}
```

That doesn't look quite right.

### Step 3, Everything Goes Wrong!

Turns out that the expression rule, as written, looks first for just a number, and only tries an expression if it doesn't find a number first, which never happens because expressions always begin with a number or expression...  This can be fixed by rewriting it so that it tries to find an expression first, then only accepts a number a whole expression doesn't fit.

```js
function expectExpression( tokens ) {
	var production = expect.sequence([
		expect.alternation([
			expectExpression,
			expectNumber
		]),
		expectOperator,
		expect.alternation([
			expectExpression,
			expectNumber
		])
	], tokens );

	if( production ) {
		return new productions.Production( 'expression', production.contents );
	}
	else {
		return null;
	}
}
```

Let's try it now.

```js
// from "1+2-3"
var tokens = [
	{ type: 'number', value: '1' },
	{ type: 'operator', value: '+' },
	{ type: 'number', value: '2' },
	{ type: 'operator', value: '-' },
	{ type: 'number', value: '3' },
];

console.log( expectExpression( tokens ) );
```

```
RangeError: Maximum call stack size exceeded
```

Oops.

It seems that trying to match an expression at the beginning of an, um, expression is a bad idea.  And indeed, what happens is that, in expectExpression, expect.sequence tries the first item, which is expect.alternation, which itself tries its first item, which is expectExpression, which is still dealing with an unshifted token array, so it tries its sequence, which tries its first item which is an alternation, which tries... And so on, blowing the stack.

So trying to recur directly like that isn't so great.  But wait, not all hope is lost!  We can actually cover all expressions just by having a number, followed by operator, followed by another expression or number.  This then results in the parser always expecting a number at the beginning of an expression, meaning that there's always a Terminal there.  Ah hah!

```js
function expectExpression( tokens ) {
	var production = expect.sequence([
		expectNumber,
		expectOperator,
		expect.alternation([
			expectExpression,
			expectNumber
		])
	], tokens );

	if( production ) {
		return new productions.Production( 'expression', production.contents );
	}
	else {
		return null;
	}
}
```

Running this new parser on the tokens...

```js
// from "1+2-3"
var tokens = [
	{ type: 'number', value: '1' },
	{ type: 'operator', value: '+' },
	{ type: 'number', value: '2' },
	{ type: 'operator', value: '-' },
	{ type: 'number', value: '3' },
];

console.log( expectExpression( tokens ) );
```

Gives us...

```
Production {
	ruleName: 'expression', contents: [
		TerminalProduction { terminal: { type: 'number', value: '1' } },
		TerminalProduction { terminal: { type: 'operator', value: '+' } },
		Production { ruleName: 'expression', contents [
			TerminalProduction { terminal: { type: 'number', value: '2' } },
			TerminalProduction { terminal: { type: 'operator', value: '-' } },
			TerminalProduction { terminal: { type: 'number', value: '3' } },
		] },
	]
}
```

It works!  Sort of.  While it's not too unmanageable now, any long expression is going to result in super deeply nested things.  In fact, efficiently evaluating that would result in walking the expression *backwards*!  Either we're going to have to flatten that, or rewrite *again*.  Well, doing it the right way now is better, so let's do that.

When we wrote the expression rule, we wrote it in terms of itself, which is why the above nesting occurred.  We can, howeer, use Repetitions instead of recurring to express this pattern.

```
expression = number, operator, number, { operator, number }
```

Remember that Repetitions in EBNF signify **zero** or more repetitions, so we need that thing before it.

```js
function expectExpression( tokens ) {
	var production = expect.sequence([
		expectNumber,
		expectOperator,
		expect.repetition( expect.sequence([
			expectExpression,
			expectNumber
		]))
	], tokens );

	if( production ) {
		return new productions.Production( 'expression', production.contents );
	}
	else {
		return null;
	}
}
```

Then running those tokens through this shiny new expectation gives us...

```
Production {
	ruleName: 'expression', contents: [
		TerminalProduction { terminal: { type: 'number', value: '1' } },
		TerminalProduction { terminal: { type: 'operator', value: '+' } },
		TerminalProduction { terminal: { type: 'number', value: '2' } },
		TerminalProduction { terminal: { type: 'operator', value: '-' } },
		TerminalProduction { terminal: { type: 'number', value: '3' } },
	]
}
```

Basically what we put in.  ... Oh dear.  Guess we don't need a parser for that, do we.

### Step 5: Rethink Everything!

So it seems that just evaluating numbers from left to right with out regard for order of operations is pretty boring.  But, it's actually pretty easy to extend this to basic order of operations, like so...

```
expression = product, { ( add | subtract ), product };
product = number, { ( multiple | divide ) }, number };
```

Rewriting the JS to match this will result in a structure that, when evaluated, will perform any multiplications and divisions from left to right first before doing additions and subtractions.  Thus, `1 - 2 * 3` is treated as `1 - (2 * 3)`.

```js
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

	if( production ) {
		return new productions.Production( 'sum', production.contents );
	}

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
