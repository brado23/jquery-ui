(function ($) {
    $.fn.extend({
        pager: function (options) {
            var args = arguments;
            return this.each(function () {
                if (typeof options === "object") {

                    // Initialization...

                    var dataSource = options.dataSource;
                    if (dataSource) {
                        $(dataSource).bind("refreshed", function () {
                            updatePager(dataSource.totalCount);
                        });

                        var pageSize = options.pageSize || 10;
                        var pageNumber;
                        var pageCount;

                        var pageUpButton = $("<input type='button'/>").button({ label: "Page Up" }).click(function () { setPage(pageNumber - 1, true); });
                        var pageDownButton = $("<input type='button'/>").button({ label: "Page Down" }).click(function () { setPage(pageNumber + 1, true); });

                        $(this).empty().append(pageUpButton).append(pageDownButton);
                        setPage(0, false);  // Prime the data source with paging options.  Initial enabling/disabling of paging buttons.

                        function setPage(newPageNumber, refresh) {
                            pageNumber = newPageNumber;
                            dataSource.option("paging", { skip: pageNumber * pageSize, take: pageSize, includeTotalCount: true });
                            if (refresh) {
                                dataSource.refresh();
                            }
                            updatePager();
                        };

                        function updatePager(totalItemCount) {
                            if (totalItemCount) {
                                pageCount = totalItemCount === 0 ? 1 : ((totalItemCount / pageSize) + (totalItemCount % pageSize ? 1 : 0));
                                if (pageNumber >= pageCount) {
                                    // On last refresh, the item count decreased such that we're positioned past the last page.
                                    // Put us on the _new_ last page.
                                    pageNumber = pageCount - 1;
                                    setPage(pageNumber, true);
                                }
                            }

                            pageUpButton.button("option", "disabled", pageCount === undefined || pageNumber === 0);
                            pageDownButton.button("option", "disabled", pageCount === undefined || pageNumber >= pageCount - 1);
                        };

                        $(this).data("__pager__", {
                            setPage: function (newPageNumber, refresh) {
                                setPage(newPageNumber, refresh);
                            }
                        });
		    }
		} else if (typeof options === "string") {

                    // Setting options...

                    var option = options;
                    if (option === "setPage") {
                        var optionValue = args[1];

                        var newPageNumber;
                        var refresh;
                        if (typeof optionValue === "object") {
                            newPageNumber = optionValue.pageNumber || 0;
                            refresh = optionValue.refresh === undefined ? false : optionValue.refresh;  // Default is "false";
                        } else {
                            newPageNumber = optionValue || 0;
                        }

                        var pager = $(this).data("__pager__");
                        pager.setPage(newPageNumber, !!refresh);
                    }
                }
	    });
	}
    });
})(jQuery);
