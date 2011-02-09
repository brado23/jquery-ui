/*
 * Grid
 * 
 * Depends on:
 * tmpl
 * datastore
 * 
 * Optional:
 * extractingDatasource
 */
(function( $ ) {

$.widget( "ui.grid", {
	options: {
		columns: null,
		type: null,
		rowTemplate: null
	},
	_create: function() {
		var that = this;
		that._columns();
		that._rowTemplate();
		that.element.addClass( "ui-widget" );
		that.element.find( "th" ).addClass( "ui-widget-header" );
		that.element.delegate( "tbody > tr", "click", function( event ) {
			if ( that.options.selectMode ) {
				var selectedItem = $( this ).tmplItem();
				if ( that.selectedItem !==  selectedItem) {
					if ( that.selectedItem ) {
						$( that.selectedItem.nodes ).removeClass( "grid-selected-row" )
					}
					$( selectedItem.nodes ).addClass( "grid-selected-row" )
					$.setField( that, "selectedItem", selectedItem );
				}
				that._trigger( "select", event, { // So have both a select event and a generic fieldChanged event for selectedItem.
					selectedItem: selectedItem
				});
			}
		});
		that._source();
		$( that ).bind( "changeField", function( event, field, value ) {
			if ( field === "source" ) {
				that._source();
			}
		});
		$( that.options ).bind( "changeField", function( event, field, value ) {
			if ( field === "source" ) {
				that._source();
			}
		});
	},
	refresh: function() {
		var tbody = this.element.find( "tbody" ).empty(),
			template = this.options.rowTemplate,
			linkOptions = $.link.defaults.nomap.form.to;
				
		$.tmpl( template, this.source, { rendered: function( tmplItem ){
			$.link( tmplItem.nodes[0], tmplItem.data, linkOptions );
		}}).appendTo( tbody );

		tbody.find( "td" ).addClass( "ui-widget-content" );
	},
		
	_source: function() {
		var source = this.options.source;
		if ( source !== this.source) {
			// doesn't cover generating the columns option or generating headers when option is specified
			this.source = source || null;
			this.refresh(); 
		}
	},
	
	_setOption: function( key, value ) {
		this._super( "_setOption", key, value );
		$.setField( this.options, key, value );
	},

	_columns: function() {
		if ( this.options.columns ) {
			// TODO check if table headers exist, generate if not
			return;
		}
		this.options.columns = this.element.find( "th" ).map(function() {
			var field = $( this ).source( "field" );
			if ( !field ) {
				// generate field name if missing
				field = $( this ).text().toLowerCase().replace(/\s|[^a-z0-9]/g, "_");
			}
			return field;
		}).get()
	},

	_rowTemplate: function() {
		var options = this.options,
			template = options.rowTemplate;
		if ( !template ) {
			template = $.map( options.columns, function( field, index ) {
				return "<td" 
				+ (options.editable[ index ] ? 
						"><input name='" + field + "' value='${" + field + "}'></input>" :
						" name='" + field + "'>${" + field + "}")
				+ "</td>";
			}).join( "" );
			template = "<tr>" + template + "</tr>";
		}
		options.rowTemplate = $.template( template ); // compile the template
	}
});

})( jQuery );
