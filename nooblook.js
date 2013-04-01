// initialize your plugin
BBLog.handle("add.plugin", {

    /**
    * The unique, lowercase id of my plugin
    * Allowed chars: 0-9, a-z, -
    */
    id : "nooblook",

    /**
    * The name of my plugin, used to show config values in bblog options
    * Could also be translated with the translation key "plugin.name" (optional)
    *
    * @type String
    */
    name : "Nooblook - Glimpse of server's average level",

    /**
    * Some translations for this plugins
    * For every config flag must exist a corresponding EN translation
    *   otherwise the plugin will no be loaded
    *
    * @type Object
    */
    translations : {
        "en" : {
            "general.apikey" : "Apikey for accessing the server that handles the requests"
        }
    },

    /**
    * Config flags, added to the BBLog Options Container
    * Config flags are served as integer, 1 or 0
    * Every flag must be a array with following keys,
    *   first key[0]: is the config flag name
    *   second key[1]: is the default value that is initially setted, when the plugin is loading the first time, 1 or 0
    *   third key[2]: (optional) must be a function, this turns the config entry into a
    *     button and the handler will be executed when the user click on it (like plugins, themes, radar, etc..)
    */
    configFlags : [
        ["general.apikey", 987654321]
        // ["my.option", 1],
        // ["my.btn.option", 1, function(instance){
        //     instance.myOwnCustomFunc123(instance);
        // }],
    ],

    /**
    * A handler that be fired immediately (only once) after the plugin is loaded into bblog
    *
    * @param object instance The instance of your plugin which is the whole plugin object
    *    Always use "instance" to access any plugin related function, not use "this" because it's not working properly
    *    For example: If you add a new function to your addon, always pass the "instance" object
    */
    init : function(instance){

        // some log to the console to show you how the things work
        console.log(
            // instance.storage("my.option"),
            // instance.cache("cache.test"),
            // instance.storage("permanent.test")
        );

        // $.ajax({
        //     url: "http://api.bf3stats.com/pc/playerlist/",
        //     type: 'post',
        //     data: { players: 'n-l-g' }
        // }).done(function ( data ) {
        //     console.log(data);
        // })

        // testdata
        // instance.cache("cache.test", Math.random());
        // instance.storage("permanent.test", Math.random());
    },

    /**
    * A trigger that fires everytime when the dom is changing
    * This is how BBLog track Battlelog for any change, like url, content or anything
    *
    * @param object instance The instance of your plugin which is the whole plugin object
    *    Always use "instance" to access any plugin related function, not use "this" because it's not working properly
    *    For example: If you add a new function to your addon, always pass the "instance" object
    */
    domchange : function(instance){
        var oldSelectedServerId;
        var selectedServerId;
        var $playerlist;
        var players = new Array();
        var levels = new Array();
        var serverLevels = new Array();

        oldSelectedServerId = instance.cache('selectedServerId');
        $selectedNode = $('.serverguide-bodycells.active');
        selectedServerId = $selectedNode.attr('guid');
        $playerlist = $('#serverinfo-players-all-wrapper').find('.common-playername-personaname');

        if ( selectedServerId != oldSelectedServerId && $playerlist.length > 0) {
            // $.each( $playerlist, function(k, v) {
            //     var name = $(v).find('a').text();
            //     players[k] = name;
            // });
            // console.log(players.toString());
            instance.cache('selectedServerId', selectedServerId);

            $.ajax({
                url: '/bf3/servers/getPlayersOnServer/' + selectedServerId + '/'
            }).done(function ( data ) {
                $.each(data.players, function(k, v) {
                    $.ajax({
                        url: '/bf3/overviewPopulateStats/' + v.personaId + '/None/1/'
                    }).done(function( persondata ) {
                        var level = persondata.data.currentRankNeeded.level;
                        var ownLevel = persondata.data.compareStats.rank;

                        levels[levels.length] = level;
                        if ( levels.length == data.players.length ) {
                            var sum = levels.reduce(function(a, b) { return a + b });
                            var avg = Math.round(sum / levels.length);
                            var median = instance.median(instance, levels);

                            serverLevels[selectedServerId] = {sum: sum, avg: avg, median: median};

                            var color;

                            if ( avg <= (ownLevel - 20) ) {
                                color = '#c3df79';
                            } else if ( avg > (ownLevel - 20) && avg <= (ownLevel + 5) ) {
                                color = '#d3c27a';
                            } else if ( avg > (ownLevel + 5) && avg <= (ownLevel + 20) ) {
                                color = '#e08c36';
                            } else if ( avg > (ownLevel + 20) && avg <= (ownLevel + 40) ) {
                                color = '#f05110';
                            } else if ( avg > (ownLevel + 40) ) {
                                color = '#de0025';
                            }

                            $selectedNode.find('.serverguide-cell-players').css({
                                borderTop: '5px solid ' + color,
                                height: '38px',
                                lineHeight: '15px',
                                paddingTop: '5px'
                            })
                            $selectedNode.find('.serverguide-cell-players').append('<br>' + avg + ' (' + median + ') lvl');
                            // $selectedNode.find('.serverguide-expansions-container').append($lvlMarker.clone());
                        }
                    });
                })
            });

        }

    },

    /**
    * This could be a function that you've implemented, it's up to you and your plugin
    * Notice the "instance" parameter, you should always pass the instance to any own function
    * See in the "my.btn.option" config flag click handler where this function is called for example
    *
    * @param object instance The instance of your plugin which is the whole plugin object
    *    Always use "instance" to access any plugin related function, not use "this" because it's not working properly
    *    For example: If you add a new function to your addon, always pass the "instance" object
    */
    // myOwnCustomFunc123 : function(instance){
    //     alert("Hooo boy, you've clicked the button in the options. Now it's on you what you will make with this feature!");
    // },

    median : function ( instance, values ) {
         
        values.sort( function(a,b) {return a - b;} );
     
        var half = Math.floor(values.length/2);
     
        if(values.length % 2)
            return values[half];
        else
            return (values[half-1] + values[half]) / 2.0;
    }

    // /**
    // * This function will be setted (injected) by the initializer
    // * This placeholder must not be implemented in your plugin,
    // *    it's added for tutorial purposes only in this example to show you how the function will look like
    // * Get the translation for your plugin, depends on the current user language
    // *
    // * @param string key
    // */
    // t : function(key){},

    // *
    // * This function will be setted (injected) by the initializer
    // * This placeholder must not be implemented in your plugin,
    // *    it's added for tutorial purposes only in this example to show you how the function will look like
    // * Get/Set values in the plugin cache, cache means a temporarily cache which will be flushed after a complete page reload (not a ajax reload)
    // *
    // * @param string key
    // * @param mixed value Optional, if not set the function return the value instead of setting it
    
    // cache : function(key, value){},

    // /**
    // * This function will be setted (injected) by the initializer
    // * This placeholder must not be implemented in your plugin,
    // *    it's added for tutorial purposes only in this example to show you how the function will look like
    // * Get/Set values in the permanent storage, this data will be stored forever
    // * Please use this not as much because users browser storage is limited
    // * Also the config flag setting will be stored here, in our example "foo.bar", "my.option" and "my.btn.option" as integer values
    // *
    // * @param string key
    // * @param mixed value Optional, if not set the function return the value instead of setting it
    // */
    // storage : function(key, value){}
});