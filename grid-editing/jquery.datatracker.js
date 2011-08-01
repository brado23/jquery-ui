( function ($) {

	$.dataTracker = function ( data ) {
		if ( !this.destroy ) {
			return new $.dataTracker( data );
		}

		this.updatedItems = [];
		this._originalItems = [];
		this.insertedItems = [];
		this.removedItems = [];

		this._array = data;
		this._deferredEvents = [];

		this._makeArrayObservable( this._array );

		var that = this;
		$.each( data, function() {
			that._makeItemObservable( this );
		});
	};

	$.dataTracker.prototype = {
		_array: null,
		_deferredEvents: null,

		updatedItems: null,
		_originalItems: null,
		insertedItems: null,
		removedItems: null,

		destroy: function () {
			$.observable.extend( this._array, null );
		},

		revertItemChanges: function ( item ) {
			// TODO: This only treats updates so far.  It could be extended to treat adds/removes as well.
			var index = $.inArray( item, this.updatedItems );
			if ( index >= 0 ) {
				var originalItem = this._originalItems[ index ];
				this._originalItems.splice(index, 1);
				$.observable( item, { useDefault: true } ).setProperty( originalItem );
				$.observable( this.updatedItems, { useDefault: true } ).remove( index );
			}
		},

		// TODO: To illustrate the use of $.observable(data, { useDefault: true }), I could add
		// a "merge" function here that would merge new items into this._array.

		_makeArrayObservable: function ( array ) {
			var that = this;
			$.observable.extend( array, {
				afterChange: function( target, type, data ) {
					switch( data.change ) {
						case "insert":
							that._trackInsertedItems( data.items );
							break;

						case "remove":
							that._trackRemovedItems( data.items );
							break;

						case "refresh":
							var oldItems = data.oldItems,
								newItems = data.newItems;

							var insertedItems = $.grep( newItems, function() {
								return $.inArray( this, oldItems ) < 0;
							} );
							that._trackInsertedItems( insertedItems );

							var removedItems = $.grep( oldItems, function() {
								return $.inArray( this, newItems ) < 0;
							} );
							that._trackRemovedItems( removedItems );
							break;
					}
				},
				afterEvent: function() {
					that._triggerDeferredEvents();
				}		
			});
		},

		_trackInsertedItems: function ( items ) {
			var that = this;
			$.each( items, function( unused, item ) {
				var removedIndex = $.inArray( item, that.removedItems );
				if ( removedIndex >= 0 ) {
					that._removeItemAndDeferEvent( that.removedItems, removedIndex );
				} else {
					if ( $.inArray( item, that.insertedItems ) < 0 ) {
						that._makeItemObservable( item );
						that._pushItemAndDeferEvent( that.insertedItems, item );
					}
				}
			} );
		},

		_trackRemovedItems: function ( items ) {
			var that = this;
			$.each( items, function( unused, item ) {
				var insertedIndex = $.inArray( item, that.insertedItems );
				if ( insertedIndex >= 0 ) {
					that._removeItemAndDeferEvent( that.insertedItems, insertedIndex );
				} else {
					if ( $.inArray( item, that.removedItems ) < 0 ) {
						that._pushItemAndDeferEvent( that.removedItems, item );
					}
				}
			} );
		},

		_makeItemObservable: function( item ) {
			var that = this;
			$.observable.extend( item, {
				beforeChange: function ( target, type, data ) {
					if ( $.inArray( item, that.insertedItems ) < 0 &&
						$.inArray( item, that.updatedItems ) < 0 ) {
						that._pushItemAndDeferEvent( that.updatedItems, item );
						that._originalItems.push( $.extend( { }, item ) );
					}
				},
				afterEvent: function() {
					that._triggerDeferredEvents();
				}
			});
		},

		// We want custom data-tracker events to follow any data change events on the actual model data,
		// so clients listening on both will see in the right order:
		//   (1) A new customer was added to my array -- UI control will add a new DOM element
		//   (2) The data changelist was modified to include an "item add" -- App will style new DOM element in UI control
		_pushItemAndDeferEvent: function( array, item ) {
			var index = array.length;
			array.push( item );
			this._deferredEvents.push( function() {
				$( [ array ] ).triggerHandler( "arrayChange", { change: "insert", index: index, items: [ item ] } );
			} );
		},

		_removeItemAndDeferEvent: function( array, index ) {
			var items = array.slice( index, index + 1 );
			array.splice( index, 1 );
			this._deferredEvents.push( function() {
				$( [ array ] ).triggerHandler( "arrayChange", { change: "remove", index: index, items: items } );
			} );
		},

		_triggerDeferredEvents: function() {
			$.each(this._deferredEvents.slice( 0 ), function() { this(); } );
			this._deferredEvents.splice(0, this._deferredEvents.length);
		}
	};
} )( jQuery )
