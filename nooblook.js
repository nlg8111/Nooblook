"use strict";

/**
 * Nooblook is a Better Battlelog plugin
 *
 * Nooblook fetches BF3 servers average ranks, and compares it to your own
 * displaying it in a visual manner in server listing
 * 
 * @author Sami "NLG" Kurvinen sami.kurvinen@gmail.com
 * @author John "Johntron" Syrinek <john.syrinek@gmail.com>
 * @license Free for personal use, commercial not allowed, alteration
 * allowed with the same license and crediting author
 */

// initialize plugin
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
        // ["my.option", 1],
        // ["my.btn.option", 1, function(instance){
        //     instance.myOwnCustomFunc123(instance);
        // }],
    ],

    /**
     * Initialization routines for nooblooker
     * @param  {object} instance The instance of plugin
     */
    init : function(instance){

        // Notify that the nooblooker is loaded
        console.log('Nooblooker is loaded');

        instance.cacheOwnSkill( instance );
    },

    /**
     * domchange is triggered every time the dom changes and is responsible
     * for launching our actions. Contains the main logic of the plugin
     * 
     * @param  {object} instance The instance of plugin
     */
    domchange : function(instance){
        var $selectedNode = $('.server-row.active'),
            oldSelectedServerId = instance.cache('selectedServerId'),
            selectedServerId = $selectedNode.data('guid');
        
        if (!$selectedNode.length || selectedServerId === oldSelectedServerId) {
            return; // Short-circuit
        }

        instance.cache('selectedServerId', selectedServerId);
        
        $.ajax('http://battlelog.battlefield.com/bf4/servers/show/pc/' + selectedServerId + '/', {headers: {"X-AjaxNavigation":1}}).then(function (data) {
            var players = data.context.players.map(function(player) {
                    return player.persona.personaName;
                });
            
            if (players.length === 0) {
                return; // Short-circuit
            }
    
            /**
             * Cache the newly selected server GUID
             */

            /**
             * Get the Players (12/16) node that will get updated.
             * Assign a loadergif to it that needs to be cleared later
             */
            var $playersBox = $selectedNode.find('.players');
            $playersBox.css({
                background: 'url("http://i.imgur.com/utu7sfL.gif") no-repeat 90% center'
            })

            /**
             * Connect to BF3stats.com API and fetch minimal info on all the players, but including global info - which includes skill lvl
             */
            $.ajax({
                url: "http://api.bf3stats.com/pc/playerlist/",
                type: 'post',
                data: {
                    // Jquery will convert the players array to appropriate form for BF3stats so it gets the names
                    players: players,
                    opt: {
                        clear: true,
                        global: true
                    }
                },
                dataType: 'json'
            }).done(function ( data ) {
                var levels = [],
                    serverLevels = [];
                
                /**
                 * Go through each players data json and store their skill level from it for counting them
                 *
                 * Note that the BF3stats is not particularily fast and lacks a lot of players data, and updating
                 * said players info to BF3stats would slow this realtime plugin way too much, so it's left out and ignored.
                 * 
                 * @param  {string} name        The Index of data.list json object, contains the name of the player
                 * @param  {object} persondata  Value of the data.list json - holds all the data
                 */
                $.each(data.list, function(name, persondata) {
                    if ( persondata.stats != null ) {
                        levels[levels.length] = persondata.stats.global.elo
                    }
                })

                /**
                 * If we actually have gotten any members with viable ranks, get the average levels and update 
                 * the players domNode
                 */
                if( levels.length > 0 ) {
                    var avgLevels = instance.getAvgLevels( instance, levels );
                    instance.updatePlayersBox( instance, $playersBox, avgLevels );
                }

                /**
                 * Clear the loadergif from players domnode background
                 */
                $playersBox.css({
                    background: 'none'
                })
            })
        });
    },

 
    /**
     * Gets the median out of array of values
     * I got this from somewhere in StackOverflow.
     * 
     * @param  {object} instance The instance of the plugin
     * @param  {array} values   Values array to get the mean from
     * @return {decimal}        The mean
     */
    median : function ( instance, values ) {
         
        values.sort( function(a,b) {return a - b;} );
     
        var half = Math.floor(values.length/2);
     
        if(values.length % 2)
            return values[half];
        else
            return (values[half-1] + values[half]) / 2.0;
    },

    /**
     * Gets the average and mean of given levels array  
     * 
     * @param  {Object} instance The instance of the plugin
     * @param  {Array} levels    The array holding all the levels of players 
     * @return {object}          Object containing the sum, average and median
     */
    getAvgLevels : function ( instance, levels ) {
        var sum = Math.round(levels.reduce(function(a, b) { return a + b }));
        var avg = Math.round(sum / levels.length);
        var median = Math.round(instance.median(instance, levels));

        return { sum: sum, avg: avg, median: median };
    },

    /**
     * Throws the fetched avgLevels and comparsions to the serverlist dom of current server
     * 
     * @param  {object} instance    The instance of the plugin
     * @param  {jquery dom} $playersBox This is the actualy domnode that gets updated
     * @param  {Object} avgLevels   This is the averageLevels object that is returned from getAvgLevels()
     */
    updatePlayersBox : function ( instance, $playersBox, avgLevels ) {
        var ownSkill = instance.getOwnSkill( instance );
        var backgroundColor = instance.getBackgroundColorSkill( instance, ownSkill, avgLevels.avg );

        $playersBox.css({
            borderLeft: '8px solid ' + backgroundColor,
            height: '39px',
            width: '63px',
            lineHeight: '15px',
            paddingTop: '8px',
            paddingLeft: '4px'
        })
        $playersBox.append('<br>' + avgLevels.avg + ' (' + avgLevels.median + ')');
    },

    /**
     * Parses your own rank from the dom. Your own rank is not stored anywhere as plain text, and only
     * logical way to get it with out doing another HTTP request, is to parse it from the rank imageurl
     * @param  {object} instance The instance of plugin
     * @return {Integer}          Returns your own rank that is fetched from the dom
     */
    getOwnRank : function ( instance ) {
        // Get the whole url
        var rankImageUrl = $('.main-loggedin-rankbar-prev').attr('src');
        // Get the file from said url
        var rankImage = rankImageUrl.replace(/^.*[\\\/]/, '');
        // Remove the "r" and "ss" and ".png" parts of the filename
        var rankFromImage = parseInt(rankImage.replace(/[^0-9]/g, ''));
        // Start with lvl 0
        var rank = 0;
        // If you're over rank 45, the filenaming changes and starts the count from 1 so compensate
        if( rankImage.match('/ss/') ) {
            rank += 45;
        } 
        rank += rankFromImage;
        return rank;
    },

    /**
     * Caches your own rank for later use
     */
    cacheOwnRank : function ( instance ) {
        
        var domReady = 0;
        var cachedRank = instance.cache('self.rank');
        
        if ( $('.main-loggedin-rankbar-prev').length > 0 ) {
            domReady = 1;
        }

        if ( cachedRank !== null || domReady == 0 ) {
            return cachedRank;
        }

        instance.cache('self.rank', instance.getOwnRank( instance ));
    },

    /**
     * Gets your skill from BF3stats.com
     */
    getOwnSkill : function ( instance ) {
        /**
         * If we have fetched the skill already - no need to fetch it again.
         */
        if ( instance.cache('self.skill') !== null ) {
            return instance.cache('self.skill');
        }

        var name = instance.getOwnName( instance );
        var skill;

        $.ajax({
            url: 'http://api.bf3stats.com/pc/playerlist/',
            type: 'post',
            dataType: 'json',
            async: false,
            data: {players: name }
        }).done( function ( data ) {
            if ( data.list[name].stats !== null && typeof data.list[name].stats !== 'undefined' ) {
                skill = Math.round(data.list[name].stats.global.elo);
            } else {
                console.log('Error getting your skill - please update your BF3stats profile.')
            }
        })

        return skill;
    },

    /**
     * Gets your own name from dom
     */
    getOwnName : function ( instance ) {
        var name = $('.soldierstats-box .name').text().trim();
        return name;
    },

    /**
     * Caches and returns your own skill
     */
    cacheOwnSkill : function ( instance ) {
        var skill = instance.getOwnSkill( instance );
        instance.cache('self.skill', skill);
        return skill;
    },

    /**
     * calcBackgroundColor calculates a fluid range of colors for the comparison indicator.
     * However, I found that the differences were too suttle and it didn't properly steer
     * the desire to join a server that was a little bit over your head vs. WAY over your head.
     * So I ended up disabling it and creating a rank staircase type of thingy with getBackgroundColor
     */
    // calcBackgroundColor : function ( instance, ownRank, avgLevel ) {
    //     var ratio = avgLevel / ownRank;
    //     var topValue = 220;
    //     var minValue = 0;
    //     var red = minValue;
    //     var green = minValue;
    //     var blue = minValue;

    //     if ( ratio < 1 ) {
    //         green = topValue;
    //         red += Math.round((topValue - minValue) * ratio);
    //     } else {
    //         red = topValue;
    //         green += Math.round((topValue - minValue) * (1 / ratio));
    //     }
    //     colors = {
    //         red: red,
    //         green: green,
    //         blue: blue
    //     }
    //     console.log(colors);
    //     return 'rgb('+red+','+green+','+blue+')';
    // },
    // 
    
    /**
     * Returns a given color for the comparison indicator based on rank ranges. If the server's rank is 
     * over 20 ranks below you, it shows it as gray. If it's within 20 levels under you, it shows it as green as
     * easy, and every 10 levels get it closer to red, until its over 40 levels higer than you and it's all red.
     * @param  {object} instance The plugin instance
     * @param  {integer} ownRank  Your own rank
     * @param  {int} avgLevel The average level that you base your comparisons
     * @return {string}          The HEX color value for the indicator
     */
    getBackgroundColorRank : function ( instance, ownRank, avgLevel ) {
        var treshold = 10;
        var color;
        if ( avgLevel <= (ownRank - treshold * 2) ) {
            color = '#797979';
        } else if (avgLevel > (ownRank - treshold * 2) && avgLevel <= (ownRank - treshold) ) {
            color = '#c7da46';
        } else if ( avgLevel > (ownRank - treshold) && avgLevel <= (ownRank + treshold) ) {
            color = '#dad846';
        } else if ( avgLevel > (ownRank + treshold) && avgLevel <= (ownRank + treshold * 2) ) {
            color = '#dab546';
        } else if ( avgLevel > (ownRank + treshold * 2) && avgLevel <= (ownRank + treshold * 3) ) {
            color = '#da8146';
        } else if ( avgLevel > (ownRank + treshold * 3) && avgLevel <= (ownRank + treshold * 4) ) {
            color = '#da6246';
        } else if ( avgLevel > (ownRank + treshold * 4) ) {
            color = '#da4646';
        }

        return color;
    },

    /**
     * Returns a given color for the comparison indicator based on Level ranges. If the server's Level is 
     * over 300 Levels below you, it shows it as gray. If it's within 200 levels under you, it shows it as green as
     * easy, and every 100 levels get it closer to red, until its over 400 levels higer than you and it's all red.
     * @param  {object} instance The plugin instance
     * @param  {integer} ownLevel  Your own Level
     * @param  {int} avgLevel The average level that you base your comparisons
     * @return {string}          The HEX color value for the indicator
     */
    getBackgroundColorSkill : function ( instance, ownLevel, avgLevel ) {
        var treshold = 100;
        var color;
        if ( avgLevel <= (ownLevel - treshold * 3) ) {
            color = '#797979';
        } else if (avgLevel > (ownLevel - treshold * 3) && avgLevel <= (ownLevel - treshold) ) {
            color = '#c7da46';
        } else if ( avgLevel > (ownLevel - treshold) && avgLevel <= (ownLevel) ) {
            color = '#dad846';
        } else if ( avgLevel > (ownLevel) && avgLevel <= (ownLevel + treshold) ) {
            color = '#dab546';
        } else if ( avgLevel > (ownLevel + treshold) && avgLevel <= (ownLevel + treshold * 2) ) {
            color = '#da8146';
        } else if ( avgLevel > (ownLevel + treshold * 2) && avgLevel <= (ownLevel + treshold * 3) ) {
            color = '#da6246';
        } else if ( avgLevel > (ownLevel + treshold * 4) ) {
            color = '#da4646';
        }

        return color;
    }
});
