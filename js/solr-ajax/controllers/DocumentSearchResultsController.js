/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* DocumentSearchResultsController                                           */

/**
 * Presents search results for a named query.
 * @param $scope
 * @param $attrs
 * @param $location
 * @param $route
 * @param $routeParams
 * @param $window
 * @param SolrSearchService
 * @param Utils
 */
function DocumentSearchResultsController($scope, $rootScope, $attrs, $location, $route, $routeParams, $window, SolrSearchService, Utils) {
    $scope.Date;
    // document search results
    $scope.documents = [];

    // the number of search results to display per page
    $scope.documentsPerPage = 20;

    $scope.siteDomainPath = $rootScope.siteDomainPath;
    // the current webpage's hostname/ what is sent to solr as a filter query 
    $scope.siteDomainHostname = $rootScope.siteDomainHostname;
    // what gets shown on the html before the relative path. 
    $scope.siteDomainAlias = $rootScope.siteDomainAlias;

    // flag for when the controller has submitted a query and is waiting on a
    // response
    $scope.loading = false;

    // set old count variable for doc counter
    $scope.oldTotalResults = 0;

    // the current search result page
    $scope.page = 0;

    // list of pages in the current navigation set plus prev and next
    $scope.pages = [];

    // list of pages in the current navigation set
    $scope.pagesOnly = [];

    // the number of pages in a navigation set
    $scope.pagesPerSet = 10;

    // flag for resetting location on page refresh
    $scope.resetLocation = true;

    // flag for if infinite scroll is enabled
    $scope.scrollInfinite = false;

    // flag for when the controller has submitted a load more query and is waiting on a
    // response
    $scope.scrollLoading = false;

    // amount of times that the infiniscroll has been called
    $scope.scrollPage = 1;

    // how much to increment the infiniscroll results
    $scope.scrollPageIncrement = 20;

    // default sort option.  Set to null to prevent default sorting OR if sorting is not defined in the index.
    $scope.sortOption = null;

    // the query name
    $scope.queryName = SolrSearchService.defaultQueryName;

    // url to solr core
    $scope.source = undefined;

    // zero based document index for first record in the page
    $scope.start = 0;

    // count of the total number of result pages
    $scope.totalPages = 1;

    // count of the total number of search results
    $scope.totalResults = 0;

    // count of the number of search result sets
    $scope.totalSets = 1;

    // update the browser location on query change
    $scope.updateLocationOnChange = true;

    // user query
    $scope.userquery = '';

    // show addl locations
    $scope.isVisible = [];

    // measured search analytics key
    $scope.measuredSearchKey = '';

    

    ///////////////////////////////////////////////////////////////////////////

    /**
     * A page in a pagination list
     * @param Name Page name
     * @param Num Page number
     */
    function Page(Name, Num) {
        this.name = Name;
        this.number = Num;
        this.isCurrent = false;
    }

    // replace special characters with a space, then where there are two or more spaces, replace with a single space
    // also makes sure that if there is a space at the start or end of the string, it gets removed.
    function replaceSpecialChars(value) {
        return value.replace(/[\&\:\(\)\[\\\/]/g, ' ').replace(/\s{2,}/g, ' ').replace(/^\s/, '').replace(/\s$/, '').split(' ').join('*');
    };

    /**
     * Set the results page number.
     * @param Start Index of starting document
     */
    $scope.handleSetPage = function (Start) {

        var query = SolrSearchService.getQuery($scope.queryName);
        query.setOption('start', Start * $scope.documentsPerPage);

        if ($scope.updateLocationOnChange) {
            var hash = query.getHash();
            $location.path(hash);
            $window.scrollTo(0, 0);
        } else {
            $scope.loading = true;
            SolrSearchService.updateQuery($scope.queryName);
        }
    };

    /**
     * Retreive more results
     * @param Start Index of starting document
     */
    $scope.loadMoreResults = function (Start) {
        $scope.scrollInfinite = true;
        var query = SolrSearchService.getQuery($scope.queryName);
        query.setOption('start', 0);
        query.setOption('rows', $scope.scrollPage * $scope.scrollPageIncrement);

        if ($scope.updateLocationOnChange) {
            var hash = query.getHash();
            $location.path(hash);
            $scope.documentsPerPage += $scope.scrollPageIncrement;
            $scope.scrollPage++;
            //$window.scrollTo(0, 0);
        } else {
            $scope.loading = true;
            $scope.scrollLoading = true;
            SolrSearchService.updateQuery($scope.queryName);
        }

    };

    /**
     * Update the controller state.
     */
    $scope.handleUpdate = function () {
        // clear current results
        $scope.documents = [];
        $scope.loading = false;
        $scope.scrollLoading = false;
        // get new results
        var results = SolrSearchService.getResponse($scope.queryName);
        if (results && results.docs) {
            if (results.numFound !== $scope.totalResults) {
                $scope.oldTotalResults = $scope.totalResults;
            }

            // get query
            var query = SolrSearchService.getQuery($scope.queryName);

            $scope.totalResults = results.numFound;
            // calculate the total number of pages and sets
            $scope.totalPages = Math.ceil($scope.totalResults / $scope.documentsPerPage);
            $scope.totalSets = Math.ceil($scope.totalPages / $scope.pagesPerSet);

            // Measured Search: Search analytics function call
            //$scope.trackSearch();

            // add new results
            for (var i = 0; i < results.docs.length && i < $scope.documentsPerPage; i++) {
                // clean up document fields
                results.docs[i].fromDate = Utils.formatDate(results.docs[i].fromDate);
                results.docs[i].toDate = Utils.formatDate(results.docs[i].toDate);

                // add to result list

                $scope.documents.push(results.docs[i]);
                var date = results.docs[i].created_at;
                var dateq = new Date(results.docs[i].created_at);
                var date1 = dateq.toDateString();
                var dates2 = date1.split(' ');
                $scope.Date = dates2[1] + ' ' + dates2[2] + ', ' + dates2[3];

            }
        } else {


            $scope.documents = [];
            $scope.oldTotalResults = 0;
            $scope.totalResults = 0;
            $scope.totalPages = 1;
            $scope.totalSets = 1;

            $scope.loading = true;
            $scope.scrollLoading = true;
        }
        // update the page index
        $scope.updatePageIndex();

    };

    /// MEASURED SEARCH - ANALYTICS BEGIN ///
    $scope.trackSearch = function () {
        if (typeof _msq !== 'undefined') {
            if ($scope.userquery)
                _msq.push(['track', {
                    key: $scope.measuredSearchKey,
                    query: $scope.userquery,
                    shownHits: $scope.documentsPerPage,
                    totalHits: $scope.totalResults,
                    pageNo: $scope.scrollPage
                }]);
        }
    }

    $scope.trackSearchClick = function (docPosition, doc) {
        if (typeof _msq !== 'undefined') {
            _msq.push(['trackClick', {
                key: $scope.measuredSearchKey,
                query: $scope.userquery,
                cDocId: doc.physicianProfileURL,
                cDocTitle: doc.physicianName[0],
                position: docPosition + 1, //may be zero if first one 
                pageNo: $scope.scrollPage,
                pageUrl: doc.physicianProfileURL,
                showHits: $scope.documentsPerPage,
                totalHits: $scope.totalResults
            }]);
        }
    }
    /// MEASURED SEARCH - ANALYTICS END ///

    /**
     * Initialize the controller.
     */
    $scope.init = function () {
        $scope.leafurl();
        // apply configured attributes
        for (var key in $attrs) {
            if ($scope.hasOwnProperty(key)) {
                if (key == 'documentsPerPage' || key == 'pagesPerSet') {
                    $scope[key] = parseInt($attrs[key]);
                } else if ($attrs[key] == 'true' || $attrs[key] == 'false') {
                    $scope[key] = $attrs[key] == "true";
                } else {
                    $scope[key] = $attrs[key];
                }
            }
        }
        // handle location change event, update query results
        $scope.$on("$routeChangeSuccess", function () {
            // if there is a query in the current location
            $scope.query = ($routeParams.query || "");
            if ($scope.query) {
                // reset state
                $scope.loading = false;
                $scope.scrollLoading = false;
                // get the current query
                var query = SolrSearchService.getQueryFromHash($scope.query, $rootScope.appleseedsSearchSolrProxy);
                // if there is a data source specified, override the default
                if ($scope.source) {
                    query.solr = $scope.source;
                }
                // set $scope.sortOption based on query sort option.
                $scope.setSortOption(query);

                query.solr = $rootScope.appleseedsSearchSolrProxy;
                query.setOption("rows", $scope.documentsPerPage);
                // set the display values to match those in the query
                $scope.userquery = query.getUserQuery();
                // update query results
                SolrSearchService.setQuery($scope.queryName, query);
                $scope.loading = true;
                $scope.scrollLoading = true;
                SolrSearchService.updateQuery($scope.queryName);

                var hash = query.getHash();
                if (hash.includes("sort=score desc")) {
                    //console.log("use score sort");
                    //console.log(hash);
                    //DONE - if sort is defined, the default behavior will kick in which is a relevant search
                    $scope.relevantSearch();
                } else {
                    //console.log("use glossary_sort");
                    //console.log(hash);
                    //DONE - if sort is not score, do alpha/glossary sort 
                    $scope.initialSearch($scope.sortOption);
                }

            }
            for (var item in $scope.isVisible) {
                $scope.isVisible[item] = false;
            }
        });
        // handle update events from the search service
        $scope.$on($scope.queryName, function () {
            $scope.handleUpdate();
        });

    };

    /**
     * Sets the alpha search to sort on last name and can be flipped ( asc/desc) . 
     * Alternatively also used to start the initial search. 
     */
    $scope.initialSearch = function (sortOrder) {
       
        // console.log("in initial alpha search");
        
        // clean up the user query
        var trimmed = Utils.trim($scope.userquery);
        if (trimmed === '') {
           
            $scope.userquery = "*:*";
        }
        // build the query string
        var query = SolrSearchService.getQuery($scope.queryName);
        var hash = $location.$$path.substring(1);
        if (hash && $scope.resetLocation) {
            query = SolrSearchService.getQueryFromHash(hash, $rootScope.appleseedsSearchSolrProxy);
        } else if (query == undefined) {
            query = SolrSearchService.createQuery($rootScope.appleseedsSearchSolrProxy);
        }

        // retrieve user query upon page load
        $scope.userquery = query.getUserQuery();
        query.setUserQuery($scope.userquery);

        query.solr = $rootScope.appleseedsSearchSolrProxy;

        if (sortOrder == null) {
            // do nothing
        } else if (sortOrder === 'asc' || sortOrder === 'desc') {
            query.setOption("sort", "glossary_sort " + sortOrder);
        } else {
            //always start with alpha search in this initialSearch method
            query.setOption("sort", "glossary_sort asc");
        }

        query.setNearMatch($scope.nearMatch);
        query.setUserQuery($scope.userquery);

        SolrSearchService.setQuery($scope.queryName, query);
        SolrSearchService.updateQuery($scope.queryName);
        // the onRouteChange event handler will take care of the update

        // if created from sort event, then do the refresh thing
        if (sortOrder != 'false') {
            // update the window location
            var hash = query.getHash();
            if ($scope.redirect) {
                $window.location.href = $scope.redirect + '#' + hash;
            } else {
                $location.path(hash);
            }
        }

    }
    

    /**
    * Sets the search sorting to score or relevance
    */
    $scope.relevantSearch = function () {
        // console.log("in relevant search");
        // clean up the user query
        var trimmed = Utils.trim($scope.userquery);
        if (trimmed === '') {

            $scope.userquery = "*:*";
        }
       
        // build the query string
        var query = SolrSearchService.getQuery($scope.queryName);
        if (query == undefined) {
            query = SolrSearchService.createQuery($rootScope.appleseedsSearchSolrProxy);
        }
        query.solr = $rootScope.appleseedsSearchSolrProxy;
        //query.setOption("sort", "score desc");
        query.setNearMatch($scope.nearMatch);
        query.setUserQuery($scope.userquery);

        SolrSearchService.setQuery($scope.queryName, query);
        SolrSearchService.updateQuery($scope.queryName);

        // update the window location
        var hash = query.getHash();
        if ($scope.redirect) {
            $window.location.href = $scope.redirect + '#' + hash;
        } else {
            $location.path(hash);
        }
    }

    /**
     * Depending on the selection runs the proper sortOption with methods
     */
    $scope.sortOptionChange = function () {
        switch ($scope.sortOption) {
            case "rel":
                $scope.relevantSearch();
                break;
            case "asc":
                $scope.initialSearch("asc");
                break;
            case "desc":
                $scope.initialSearch("desc");
            default:
                break;
        }
    }




    /**
     * Update page index for navigation of search results. Pages are presented
     * to the user and are one-based, rather than zero-based as the start
     * value is.
     */
    $scope.updatePageIndex = function () {
        console.log($scope.queryName);
        var query = SolrSearchService.getQuery($scope.queryName);
        $scope.documentsPerPage = (query.getOption('rows') || $scope.documentsPerPage);
        $scope.page = (Math.ceil(query.getOption('start') / $scope.documentsPerPage) || 0);
        // the default page navigation set 
        $scope.pages = [];
        // the default page navigation set - numbers only
        $scope.pagesOnly = [];
        // determine the current zero based page set
        var currentSet = Math.floor($scope.page / $scope.pagesPerSet);
        // determine the first and last page in the set
        var firstPageInSet = (currentSet * $scope.pagesPerSet) + 1;
        var lastPageInSet = firstPageInSet + $scope.pagesPerSet - 1;
        if (lastPageInSet > $scope.totalPages) {
            lastPageInSet = $scope.totalPages;
        }
        // link to previous set
        if ($scope.totalSets > 1 && currentSet != 0) {
            var previousSet = firstPageInSet - $scope.pagesPerSet - 1;
            var prevPage = new Page("«", previousSet);

            $scope.pages.push(prevPage);
        }
        // page links
        for (var i = firstPageInSet; i <= lastPageInSet; i++) {
            var page = new Page(i, i - 1);
            if (page.number == $scope.page) {
                page.isCurrent = true;
            }
            $scope.pages.push(page);
            $scope.pagesOnly.push(page);
        }
        // link to next set
        if ($scope.totalSets > 1 && currentSet < $scope.totalSets - 1) {
            var nextSet = lastPageInSet;
            var nextPage = new Page("»", nextSet);
            $scope.pages.push(nextPage);
        }

        //page start from result section for mobile view 
        var txt = screen.width + "*" + screen.height;
        if (txt == "320*568" || txt == "375*667" || txt == "414*736" || txt == "375*812" || txt == "768*1024" || txt == "411*823" || txt == "411*731" || txt == "360*640") {
            var elmnt = document.getElementById("searchresults");
            elmnt.scrollIntoView();
        }
    };

    $scope.setSortOption = function (query) {
        if ($scope.sortOption == null) {
            // Do nothing
        } else if (query.getOption("sort") == "glossary_sort asc") {
            $scope.sortOption = "asc";
        } else if (query.getOption("sort") == "glossary_sort desc") {
            $scope.sortOption = "desc";
        } else {
            $scope.sortOption = "rel";
        }
    };

    $scope.showMoreLocations = function (item) {
        //If DIV is visible it will be hidden and vice versa.
        $scope.isVisible[item] = !$scope.isVisible[item];
    };

    //Get leaves reader URL
    $scope.leafurl = function () {
        $.ajax({
            type: "GET",
            url: "config.json",
            dataType: "json",
            success: function (json) {

                $scope.url = json.reader.url;
                $scope.uri = json.stageleaves.url;

            }
        });
    };


  

    // Common URL for filterByword function
    $scope.Userfilter = function (urllocation) {

        $scope.urllocation = '';
        $scope.urllocation = urllocation.split('#');
        parent.location.hash = $scope.urllocation[1];

    };

    //Filter by match any or match all word
    $scope.filterByword = function () {
        
        $scope.urllocation = '';
        $scope.word = '';
        $scope.word = document.getElementById('userquery').value;
        if (document.getElementById('Any_Words').checked) {
            if ($scope.word != "") {
                $scope.urllocation = window.location.href + "&q=" + $scope.word + "&fq=title:&start=0";
                $scope.Userfilter($scope.urllocation);

            }
            else {
                $scope.urllocation = window.location.href + "&q=*:*&rows=20&";
                $scope.Userfilter($scope.urllocation);

            }
        }
        if (document.getElementById('All_Words').checked) {
            if ($scope.word != "") {
                $scope.urllocation = window.location.href + "&q=*:*&fq=title:" + '"' + $scope.word + '"' + "&start=0";
                $scope.Userfilter($scope.urllocation);
                

            }
            else {
                $scope.urllocation = window.location.href + "&q=*:*&fq=title:&rows=20&";
                $scope.Userfilter($scope.urllocation);
              
               
            }
        }

    };





    // screen scroller for mobile view 

    $scope.screenscrol = function () {
        var elmnt = document.getElementById("searchresults");
        elmnt.scrollIntoView();
    }

    var urllocation = '';
    // Common URL for every filter
    $scope.Userfilter = function (urllocation) {

        var txt = screen.width + "*" + screen.height;
        if (txt == "320*568" || txt == "375*667" || txt == "414*736" || txt == "375*812" || txt == "768*1024" || txt == "411*823" || txt == "411*731" || txt == "360*640") {
            $scope.screenscrol();
        }
        var urllocation1 = '';
        urllocation1 = urllocation.split('#');
        parent.location.hash = urllocation1[1];

    };
    //Filter by user 
    $scope.filterByUser = function () {

        switch ($scope.user_name) {
            case "0":
                urllocation = window.location.href + "&fq=user_name:(admin)&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "1":
                urllocation = window.location.href + "&fq=user_name:(jsbilgi)&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "":
                urllocation = window.location.href + "&fq=user_name:&start=0";
                $scope.Userfilter(urllocation);
                break;
        }
    };

    //Filter by day 
    $scope.filterByDay = function () {

        var fromdate = '';
        var todate = '';
        var currentdate = new Date();

        switch ($scope.days) {

            case "0":
                fromdate = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + currentdate.getDate();
                todate = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + currentdate.getDate();

                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T23:59:59Z' + "]&start=0";
                $scope.Userfilter(urllocation);
                break;


            case "1":
                fromdate = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + (currentdate.getDate() - 1);
                todate = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + (currentdate.getDate() - 1);

                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T23:59:59Z' + "]&start=0";
                $scope.Userfilter(urllocation);
                break;



            case "2":

                var startDay = 1; //0=sunday, 1=monday etc.
                var d = currentdate.getDay(); //get the current day
                var weekStart = new Date(currentdate.valueOf() - (d <= 0 ? 7 - startDay : d - startDay) * 86400000); //rewind to start day
                var weekEnd = new Date(weekStart.valueOf() + 6 * 86400000); //add 6 days to get last day

                var WS = weekStart;
                var fromdate = WS.getFullYear() + '-' + (WS.getMonth() + 1) + '-' + WS.getDate();
                var WE = weekEnd;
                var todate = WE.getFullYear() + '-' + (WE.getMonth() + 1) + '-' + WE.getDate();

                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T00:00:00Z' + "]&start=0";
                $scope.Userfilter(urllocation);
                break;

            case "3":

                var firstDay = new Date(currentdate.getFullYear(), currentdate.getMonth(), 1);
                var lastDay = new Date(currentdate.getFullYear(), currentdate.getMonth() + 1, 0);

                var fromdate = firstDay.getFullYear() + "-" + (firstDay.getMonth() + 1) + "-" + firstDay.getDate();
                var todate = lastDay.getFullYear() + "-" + (lastDay.getMonth() + 1) + "-" + lastDay.getDate();

                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T00:00:00Z' + "]&start=0";
                $scope.Userfilter(urllocation);

                break;


            case "4":

                var firstDay = new Date(currentdate.getFullYear(), currentdate.getMonth(), 1);
                var myVariable = firstDay;
                var makeDate = new Date(myVariable);
                makeDate.setMonth(makeDate.getMonth() - 1);
                var fromdate = makeDate.getFullYear() + "-" + (makeDate.getMonth() + 1) + "-" + makeDate.getDate();
                var lastDay = new Date(makeDate.getFullYear(), makeDate.getMonth() + 1, 0);
                var todate = lastDay.getFullYear() + "-" + (lastDay.getMonth() + 1) + "-" + lastDay.getDate();


                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T00:00:00Z' + "]&start=0";
                $scope.Userfilter(urllocation);
                break;

            case "5":

                var datetime = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + (currentdate.getDate() - 1);
                var a = datetime.split('-');
                var fromdate = a[0] + '-' + '1' + '-' + '1';
                var todate = a[0] + '-' + '12' + '-' + '31';


                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T00:00:00Z' + "]&start=0";
                $scope.Userfilter(urllocation);

                break;




            case "6":

                var datetime = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + (currentdate.getDate() - 1);
                var a = datetime.split('-');
                var fromdate = a[0] - 1 + '-' + '1' + '-' + '1';
                var todate = a[0] - 1 + '-' + '12' + '-' + '31';

                urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T00:00:00Z' + "]&start=0";
                $scope.Userfilter(urllocation);

                break;


            case "":

                urllocation = window.location.href + "&fq=created_at:&start=0";
                $scope.Userfilter(urllocation);
                break;
        }
    };
    //Filter By page row
    $scope.filterbyrow = function () {


        switch ($scope.rows) {

            case "20":
                urllocation = window.location.href + "&rows=20&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "50":
                urllocation = window.location.href + "&rows=50&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "100":
                urllocation = window.location.href + "&rows=100&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "":
                urllocation = window.location.href + "&rows=20&start=0";
                $scope.Userfilter(urllocation);
                break;
        }

    };

    //Filter by A-Z
    $scope.sortchar = function (val) {

        switch (val) {
            case "asc":
                urllocation = window.location.href + "&sort=title asc&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "desc":
                urllocation = window.location.href + "&sort=title desc&start=0";
                $scope.Userfilter(urllocation);
                break;
            case "no":
                urllocation = window.location.href + "&sort=&start=0";
                $scope.Userfilter(urllocation);
                break;
        }
    };
    //Filter for asc desc by date
    $scope.sortdate = function (val) {

        switch (val) {
            case "asc":
                urllocation = window.location.href + "&sort=created_at asc";
                $scope.Userfilter(urllocation);
                break;
            case "desc":
                urllocation = window.location.href + "&sort=created_at desc";
                $scope.Userfilter(urllocation);
                break;
            case "no":
                urllocation = window.location.href + "&sort=";
                $scope.Userfilter(urllocation);
                break;
        }
    };

    

    // initialize the controller
    $scope.init();

}

// inject controller dependencies
DocumentSearchResultsController.$inject = ['$scope', '$rootScope', '$attrs', '$location', '$route', '$routeParams', '$window', 'SolrSearchService', 'Utils'];

//Filter by from and to date 
function onChangeDate() {

    var urllocation = '';
    var fdate = $("#fromDate").val();
    var tdate = $("#endDate").val();
    var fdatesplit = fdate.split('-');
    var tdatesplit = tdate.split('-');
    var fromdate = fdatesplit[2] + '-' + fdatesplit[0] + '-' + fdatesplit[1];
    var todate = tdatesplit[2] + '-' + tdatesplit[0] + '-' + tdatesplit[1];


    var tilldate = '2013-01-01T00:00:00Z';
    var currentdate = new Date();
    var today = currentdate.getFullYear() + "-" + (currentdate.getMonth() + 1) + "-" + currentdate.getDate();



    if (fdate != "" && tdate != "" && fdate != "yyyy-dd-mmT00:00:00Z" && tdate != "yyyy-dd-mmT00:00:00Z") {
        if ((Date.parse(tdate) < Date.parse(fdate))) {

            $("#endDate").val('');

            document.getElementById("errorMsg").style.display = 'block';

        }
        else {
            document.getElementById("errorMsg").style.display = 'none';
            urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + todate + 'T23:59:59Z' + "]&start=0";
            commondatefilter(urllocation);
        }


    }

    if (fdate == "" && tdate == "") {

        urllocation = window.location.href + "&fq=created_at:&start=0";
        commondatefilter(urllocation);
    }
    if (fdate != "" && tdate == "") {

        urllocation = window.location.href + "&fq=created_at:[" + fromdate + 'T00:00:00Z' + ' TO ' + today + 'T23:59:59Z' + "]&start=0";
        commondatefilter(urllocation);

    }
    if (tdate != "" && fdate == "") {

        var urllocation = window.location.href + "&fq=created_at:[" + tilldate + ' TO ' + todate + 'T23:59:59Z' + "]&start=0";
        commondatefilter(urllocation);

    }


};
// Common URL for every filter
function commondatefilter(urllocation) {

    var txt = screen.width + "*" + screen.height;
    if (txt == "320*568" || txt == "375*667" || txt == "414*736" || txt == "375*812" || txt == "768*1024" || txt == "411*823" || txt == "411*731" || txt == "360*640") {
        var elmnt = document.getElementById("searchresults");
        elmnt.scrollIntoView();
    }

    var urllocation1 = urllocation.split('#');
    parent.location.hash = urllocation1[1];

}



