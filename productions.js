function Production( ruleName, initialContents ) {
	this.ruleName = ruleName;
	this.contents = [];

	if( initialContents ) {
		initialContents.forEach( function pushContentItem( item ) {
			this.push( item );
		}, this );
	}
}

Production.prototype.ruleName = '';
Production.prototype.contents = null;

Object.defineProperty( Production.prototype, 'length', {
	enumerable: true,
	configurable: true,
	get: function() {
		var l = 0, i = 0, cl = this.contents.length, citem;

		for( i = 0; i < cl; ++i ) {
			citem = this.contents[ i ];

			if( citem instanceof Production )
				l += this.contents[ i ].length;
			else
				l += 1;
		}

		return l;
	},
	set: function( newLength ) {}
});

Object.defineProperty( Production.prototype, 'ownLength', {
	enumerable: true,
	configurable: true,
	get: function() {
		return this.contents.length;
	},
	set: function( newLength ) {}
});

Production.prototype.push = function( subproduction ) {
	if( subproduction.anonymous ) {
		// TODO: Concat may be inefficient.
		this.contents = this.contents.concat( subproduction.contents );
	}
	else {
		this.contents.push( subproduction );
	}

	return this;
};



////////

function AnonymousProduction( ruleName, initialContents ) {
	Production.call( this, '<' + ruleName + '>', initialContents );
}

AnonymousProduction.prototype = new Production( '<>' );
AnonymousProduction.prototype.anonymous = true;



////////

function TerminalProduction( terminal ) {
	Production.call( this, '<terminal>', [ terminal ] );
	this.terminal = terminal;
}

TerminalProduction.prototype = new Production( '<terminal>' );
TerminalProduction.prototype.terminal = null;

Object.defineProperty( TerminalProduction.prototype, 'length', {
	enumerable: true,
	configurable: true,
	get: function() { return 1; },
	set: function( newLength ) {}
});

Object.defineProperty( TerminalProduction.prototype, 'ownLength', {
	enumerable: true,
	configurable: true,
	get: function() { return 1; },
	set: function( newLength ) {}
});

exports.Production = Production;
exports.AnonymousProduction = AnonymousProduction;
exports.TerminalProduction = TerminalProduction;
