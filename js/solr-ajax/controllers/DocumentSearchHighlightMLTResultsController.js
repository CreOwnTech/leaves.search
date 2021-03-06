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
function DocumentSearchResultsController($scope, $sce, $rootScope, $attrs, $location, $route, $routeParams, $window, SolrSearchService, Utils) {

    // document search results
    $scope.documents = [];

    // the number of search results to display per page
    $scope.documentsPerPage = 10;

    // flag for when the controller has submitted a query and is waiting on a
    // response
    $scope.loading = false;

    // the current search result page
    $scope.page = 0;

    // list of pages in the current navigation set plus prev and next
    $scope.pages = [];

    // list of pages in the current navigation set
    $scope.pagesOnly = [];

    // the number of pages in a navigation set
    $scope.pagesPerSet = 10;

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

    ///////////////////////////////////////////////////////////////////////////

    /**
     * A page in a pagination list
     * @param Name Page name
     * @param Num Page number
     */
    function Page(Name,Num) {
        this.name = Name;
        this.number = Num;
        this.isCurrent = false;
    }

    /**
     * Set the results page number.
     * @param Start Index of starting document
     */
    $scope.handleSetPage = function(Start) {
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
     * Update the controller state.
     */
    $scope.handleUpdate = function() {
        // clear current results
        $scope.documents = [];

        $scope.loading = false;
        // get new results
        var results = SolrSearchService.getResponse($scope.queryName);
        var hlResults = SolrSearchService.getHighlighting($scope.queryName);
        var mltResults = SolrSearchService.getMoreLikeThis($scope.queryName);

        //var query = SolrSearchService.getQueryFromHash($scope.query, $rootScope.appleseedsSearchSolrProxy);
        //// if there is a data source specified, override the default
        //if ($scope.source) {
        //    query.solr = $scope.source;
        //}

        if (results && results.docs) {
            $scope.totalResults = results.numFound;
            // calculate the total number of pages and sets
            $scope.totalPages = Math.ceil($scope.totalResults / $scope.documentsPerPage);
            $scope.totalSets = Math.ceil($scope.totalPages / $scope.pagesPerSet);
            // add new results
            console.log(mltResults);
            for (var i=0;i<results.docs.length && i<$scope.documentsPerPage;i++) {
                // clean up document fields

                results.docs[i].moreLikeThis = mltResults[results.docs[i].id];

                if (hlResults[results.docs[i].id].content !== undefined) {

                    results.docs[i].highlights = hlResults[results.docs[i].id];


                    $sce.trustAsHtml(results.docs[i].highlights.content[0]);
                    // add to result list
                    console.log(results.docs[i].moreLikeThis);
                }

                var regex = /(<([^>]+)>)/ig;

                results.docs[i].content[0] =  results.docs[i].content[0].replace(regex,"");

                $scope.documents.push(results.docs[i]);
            }
        } else {
            $scope.documents = [];
            $scope.totalResults = 0;
            $scope.totalPages = 1;
            $scope.totalSets = 1;
        }
        // update the page index
        $scope.updatePageIndex();
    };

    /**
     * Initialize the controller.
     */
    $scope.init = function() {
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
        $scope.$on("$routeChangeSuccess", function() {
            // if there is a query in the current location
            $scope.query = ($routeParams.query || "");
            if ($scope.query) {
                // reset state
                $scope.loading = false;
                // get the current query
                var query = SolrSearchService.getQueryFromHash($scope.query, $rootScope.appleseedsSearchSolrProxy);
                // if there is a data source specified, override the default
                if ($scope.source) {
                    query.solr = $scope.source;
                }
                query.solr = $rootScope.appleseedsSearchSolrProxy;
                query.setOption("rows",$scope.documentsPerPage);
                query.setOption("hl","true");
                query.setOption("mlt","true");
                query.setOption("mlt.fl","title,smartKeywords");
                //query.setOption("mlt.count","5");
                //query.setOption("hl.simple.pre","<strong>");
                //query.setOption("hl.simple.post","</strong>");
                // update query results
                SolrSearchService.setQuery($scope.queryName, query);
                $scope.loading = true;
                SolrSearchService.updateQuery($scope.queryName);
            }
        });
        // handle update events from the search service
        $scope.$on($scope.queryName, function () {
            $scope.handleUpdate();
        });
    };

    /**
     * Update page index for navigation of search results. Pages are presented
     * to the user and are one-based, rather than zero-based as the start
     * value is.
     */
    $scope.updatePageIndex = function() {
        var query = SolrSearchService.getQuery($scope.queryName);
        $scope.documentsPerPage = (query.getOption('rows') || $scope.documentsPerPage);
        $scope.page = (Math.ceil(query.getOption('start') / $scope.documentsPerPage) || 0);

        if(query.query !== $scope.userquery )
        {
            $scope.page =0;
        }
        // set the display values to match those in the query
        $scope.userquery = query.getUserQuery();
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
        for (var i=firstPageInSet; i<=lastPageInSet; i++) {
            var page = new Page(i, i-1);
            if (page.number == $scope.page) {
                page.isCurrent = true;
            }
            $scope.pages.push(page);
            $scope.pagesOnly.push(page);
        }
        // link to next set
        if ($scope.totalSets>1 && currentSet<$scope.totalSets-1) {
            var nextSet = lastPageInSet;
            var nextPage = new Page("»", nextSet);
            $scope.pages.push(nextPage);
        }
    };

    // initialize the controller
    $scope.init();

}

// inject controller dependencies
DocumentSearchResultsController.$inject = ['$scope','$sce', '$rootScope', '$attrs', '$location', '$route', '$routeParams', '$window', 'SolrSearchService', 'Utils'];
