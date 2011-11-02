/*
 * Observer
 *
 */
(function ( $, undefined ) {
	$.observer = function( data ) {
		return new observer( data );
	};

	function observer( data ) {
		this.data = data;

		// Proxy properties.
		// TODO Is this a good idea?  What do we do about name collisions?
		if ( !$.isArray( data ) ) {
			var that = this;
			for ( var key in data ) {
				this[ key ] = (function( key ) {
					return function() {
						return that.property( key ).data;
					};
				})(key);  // TODO Why the extra closure?
			}
		}

		this._childObservers = $.isArray(this.data) ? new Array(this.data.length) : {};  // TODO The array could be made sparse.
		// TODO Allocate _childObservers lazily?

		this._bindHandler();  // TODO Fix enumeration and bind handler lazily?
	}

	observer.prototype = {
		// TODO Is this useful for generic code that recursively descends into model?
		isObservable: function() {
			return typeof this.data === "object" || $.isArray( this.data );  // TODO Should $.observable return null for scalars?
		},

		dispose: function() {
			this._dispose();
			if ( this._detach ) {
				this._detach();
			}
		},

		_bindHandler: function() {
			if ( this.isObservable() && !this._handler ) {
				var that = this;
				this._handler = function( event, ui ) {
					switch ( event.type ) {
					case "change":
						// Dispose child observers.
						$.each( ui.oldValues, function( key, value ) {
							// TODO We don't honor keys that are paths here (only immediate property names).
							// I think we should remove "path" support from "change" events (and replace with immediate property names).
							var childObserver = that._childObservers[ key ];
							if ( childObserver ) {
								childObserver.dispose();
							}
						});

						// Add proxy properties for newly added properties.
						for ( var key in ui.newValues ) {
							if ( !that.hasOwnProperty( key ) ) {
								that[ key ] = function() {
									return that.property( key ).data;
								}
							}
						}

						// TODO Remove unset proxy properties.
						break;

					case "insert":
						that._childObservers.splice.apply( that._childObservers, [ ui.index, 0 ].concat(new Array( ui.items.length )) );
						break;

					case "remove":
						var index = ui.index,
							itemCount = ui.items.length,
							removedChildObservers = that._childObservers.slice( index, index + itemCount );
						that._childObservers.splice( index, itemCount );
						$.each( removedChildObservers, function( unused, childObserver ) {
							if (childObserver) {
								childObserver._dispose();
							}
						} );
						break;

					case "replaceAll":
						// Dispose child observers.
						$.each( that._childObservers, function( unused, childObserver ) {
							if ( childObserver ) {
								childObserver._dispose();
							}
						} );

						that._childObservers.splice.apply( that._childObservers, [ 0, ui.oldItems.length ].concat(new Array( ui.newItems.length )) );
						break;
					}

					var path = [], 
						eventToBubble = $.extend( { }, ui, { type: event.type, target: event.target } );
					$( that ).triggerHandler( "change", { path: path, event: eventToBubble } );  // TODO Rename from "change"?
					if ( that._bubbleEvent ) {
						that._bubbleEvent( eventToBubble, path );
					}
				};

				$.observable( this.data ).bind( "change insert remove replaceAll", this._handler );
			}
		},

		_childObserver: function( key, isArrayIndex ) {
			var childObserver = this._childObservers[ key ];
			if ( !childObserver ) {
				childObserver = new observer( this.data[ key ] );
				var that = this;
				if ( isArrayIndex ) {
					childObserver._bubbleEvent = function( event, path ) {
						var index = $.inArray( this, that._childObservers );
						path.unshift( index );
						$(that).triggerHandler( "change", { path: path, event: event } );
						if ( that._bubbleEvent ) {
							that._bubbleEvent( event, path );
						}
					};
					childObserver._detach = function() {
						var index = $.inArray( this, that._childObservers );
						that._childObservers[ index ] = null;
					};
				} else {
					var childPath = key;
					childObserver._bubbleEvent = function( event, path ) {
						path.unshift( childPath );
						$(that).triggerHandler( "change", { path: path, event: event } );
						if ( that._bubbleEvent ) {
							that._bubbleEvent( event, path );
						}
					};
					childObserver._detach = function () {
						delete that._childObservers[ childPath ];
					};
				}

				this._childObservers[ key ] = childObserver;
			}

			return childObserver;
		},

		_dispose: function() {
			if ( this._handler ) {
				$.observable( this.data ).unbind("change insert remove replaceAll", this._handler);
				this._handler = null;
			}

			if ( this._childObservers ) {
				$.each( this._childObservers, function( unused, childObserver ) {
					if ( childObserver ) {
						childObserver._dispose();
					}
				} );
				this._childObservers = null;
			}
		}
	}

	$.each( [ "getAt", "property" ], function() {  // TODO Re: "property", could be generalized to "path".
		var isArrayIndex = this == "getAt";
		observer.prototype[this] = function( key ) {
			// this._bindHandler();  // TODO Fix enumeration and bind handler lazily?
			return this._childObserver( key, isArrayIndex );
		};
	} );

} )( jQuery );