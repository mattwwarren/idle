var Engine      = require( 'tingodb' )();
var nicetime    = require( 'nicetime' );
var Commands    = require( './lib/commands' );
var Users       = require( './lib/users' );
var GameTimer   = require( './lib/timer' );
var Events      = require( './lib/events' );
var Monsters    = require( './lib/monsters' );
var config      = require( './config.json' );
var Q           = require( 'q' );

var ACL_OWNER   = 500;


function Idle(robot)
{
    var self        = this;
    this.config     = config;
    this.db         = new Engine.Db( config.db, {} );
    this.events     = new Events( this );

    this.monsters   = new Monsters.Monsters( this, this.config );
    this.users      = new Users.Users( this, this.db );
    this.users.load().then( function() {
        self.onUsersLoad();
    }, function( err ) {
        console.log( "Error loading users: " + err );
    });
    this.commands   = new Commands( this );
    this.commandRegex = '';
    this.initCommands();
    this.online();
    this.robot      = robot;
}


Idle.prototype.initCommands = function()
{
    this.commands.addCommand( "register", "handleRegister", "Registers an account" );
    this.commands.addCommand( "info", "handleInfo", "Prints out the info of your account" );
    this.commands.addCommand( "save", "handleSave", "Saves the database", this.config.permissions.save );
    this.commands.addCommand( "auth", "handleAuth" );
    this.commands.addCommand( "vcard", "handleVCard" );
    this.commands.addCommand( "hog", "handleHOG", "Triggers a Hand of God event", this.config.permissions.hog );
    this.commands.addCommand( "calamity", "handleCalamity", "Triggers a Calamity event", this.config.permissions.calamity );
    this.commands.addCommand( "godsend", "handleGodsend", "Triggers a Godsend event", this.config.permissions.godsend );
    this.commands.addCommand( "levelup", "handleLevelUp", "Triggers a level up event", this.config.permissions.level_up );
    this.commands.addCommand( "challenge", "handleChallenge", "Triggers a 1v1 challenge", this.config.permissions.challenge );
    this.commands.addCommand( "hof", "handleHOF", "Shows the hall of fame" );
    this.commands.addCommand( "monsters", "handleMonsters", "Shows all monsters" );
    this.commandRegex = new RegExp('^!idlerpg (' + Object.keys(this.commands.commands).join('|') + ') (.*)', 'i');
}


Idle.prototype.handleMonsters   = function( jid, args, user, email )
{
    var deferred        = Q.defer();
    var monsters        = this.monsters.monsters;
    var len             = monsters.length;
    var message         = "";

    for ( var i = 0; i < len; ++i )
    {
        var monster     = monsters[ i ];
        message         += "Level " + monster.getLevel() + " " + monster.getName() + " - itemsum " + monster.getItemSum() + " - at [" + monster.getX() + ", " + monster.getY() + "]\n";
    }

    deferred.resolve( message );
    return deferred.promise;
}


Idle.prototype.online   = function()
{
    this.gameTimer  = new GameTimer( this );
}


Idle.prototype.handleHOF    = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    var hof         = this.users.getHOF();
    var numHOF      = Math.min( hof.length, 10 );
    var message     = "Hall of fame:\n-------------------------\n";

    for ( var i = 0; i < numHOF; ++i )
    {
        var user    = hof[ i ];
        message     += ( i + 1 ) + ". " + user.getEmail() + " the level " + ( user.getLevel() + 1 ) + " " + user.getClassName() + " -- itemsum " + user.getItemSum() + "\n";
    }

    deferred.resolve( message );
    return deferred.promise;
}


Idle.prototype.handleSave   = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    var self        = this;

    this.save().then( function() {
        deferred.resolve( "Database saved." );
    }, function( err ) {
        deferred.reject( "Error saving database: " + err );
    } );

    return deferred.promise;
}


Idle.prototype.handleAuth   = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    var self    = this;

    if ( user != null && args.length > 1 && args[ 1 ] == this.config.admin_password )
    {
        user.setACL( ACL_OWNER );
        deferred.resolve( "Your ACL is now " + ACL_OWNER );
    }

    return deferred.promise;
}


Idle.prototype.handleHOG    = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    console.log( "Idle :: " + email + " triggered a Hand of God" );
    this.events.hog().then( function( msg ) {
        deferred.resolve( msg );
    }, function( error ) {
        deferred.reject( error );
    });
    return deferred.promise;
}


Idle.prototype.handleCalamity   = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    console.log( "Idle :: " + email + " triggered a calamity" );
    this.events.calamity().then( function ( msg ) {
        deferred.resolve( msg );
    }, function( error ) {
        deferred.reject( error );
    });
    return deferred.promise;
}


Idle.prototype.handleGodsend    = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    console.log( "Idle :: " + email + " triggered a Godsend" );
    this.events.godsend().then( function( msg ){
        deferred.resolve( msg );
    }, function( error ){
        deferred.reject( error );
    });

    return deferred.promise;
}

Idle.prototype.handleLevelUp    = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    console.log( "Idle :: " + email + " triggered a level up" );
    user.levelUp();
    this.events.levelUp( user ).then(function( msg ){
        deferred.resolve( msg );
    }, function( error ){
        deferred.reject( error );
    });

    return deferred.promise;
}


Idle.prototype.handleChallenge    = function( jid, args, user, email )
{
    var deferred    = Q.defer();
    console.log( "Idle :: " + email + " triggered a challenge" );
    this.events.challengeOpponent( user ).then( function( msg ){
        deferred.resolve( msg );
    }, function( error ){
        deferred.reject( error );
    });

    return deferred.promise;
}


Idle.prototype.save     = function()
{
    return this.users.saveUsers();
}


Idle.prototype.handleRegister = function( jid, args, user, email )
{
    var deferred = Q.defer();
    var self    = this;

    if ( user == null )
    {
        if ( args.length < 2 )
        {
            deferred.resolve( "Syntax: register <class name>" );
        }
        else
        {
            var className = args.slice( 1 ).join( " " );

            this.users.register( email, className ).then( function( newUser ) {
                deferred.resolve( "Registered a new account with the class: " + newUser.getClassName() + ".  You are level " + ( newUser.getLevel() + 1 ) + ".  Next level in: " + nicetime( newUser.getNextTime() ) );
            }, function( err ) {
                deferred.reject( "Error registering a new account" );
            });
        }
    }
    else
    {
        deferred.resolve( "Your account is already registered" );
    }

    return deferred.promise;
}


Idle.prototype.handleInfo   = function( jid, args, user, email )
{
    var deferred = Q.defer();
    var self     = this;

    if ( args.length > 1 )
    {
        this.users.getUser( args[ 1 ] ).then( function( newUser ) {
            if ( newUser )
            {
                self.getInfo( jid, newUser ).then( function( msg ) {
                    deferred.resolve( msg );
                }, function( error ) {
                    deferred.reject( error );
                });
            }
            else
            {
                deferred.resolve( "No such user: " + args[ 1 ] );
            }
        } );
    }
    else
    {
        self.getInfo( jid, user ).then( function( msg ){
            deferred.resolve( msg );
        }, function( error ) {
            deferred.reject( msg );
        });
    }

    return deferred.promise;
}


Idle.prototype.getInfo      = function( jid, user )
{
    var deferred = Q.defer();
    try {
        if ( user ) {
            var info    = "-- " + user.getEmail() + " --\n";
            info        += "Class: " + user.getClassName() + "\n";
            info        += "Level: " + ( user.getLevel() + 1 ) + "\n";

            var nextTime    = user.getNextTime();
            info        += "Next level in: " + nicetime( nextTime ) + " (" + nextTime + " seconds)\n";

            info        += "Location: [" + user.getX() + ", " + user.getY() + "]\n";

            var acl     = user.getACL();
            if ( acl ) {
                info    += "ACL: " + acl + "\n";
            }

            info        += "--------------------\nEquipment:\n";

            var items       = this.config.rpg.items;
            var numItems    = items.length;
            var score       = 0;

            for ( var i = 0; i < numItems; ++i ) {
                var type    = items[ i ];
                var item    = user.getItem( type );
                var level   = item.level;

                info        += type + ": " + level + "\n";
                score       += level;
            }

            info        += "\nScore: " + score;

            deferred.resolve( info );
        }
    } catch ( err ) { 
        console.log( err ); 
        deferred.reject( err ); 
    }

    return deferred.promise;
}


Idle.prototype.handleMessage = function( jid, message )
{
    var deferred = Q.defer();
    console.log( jid + " :: " + message );

    this.commands.handle( jid, message ).then( function ( msg ){
        deferred.resolve( msg );
    }, function ( error ) {
        console.log( error );
        deferred.reject( msg );
    });

    return deferred.promise;
};

Idle.prototype.userEnter = function( jid ){
    this.users.updatePresence( jid, 'online' );
};

Idle.prototype.userExit = function( jid ){
    this.users.updatePresence( jid, 'offline' );
};

module.exports = exports = Idle;
