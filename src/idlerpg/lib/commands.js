var Q           = require( 'q' );

function Commands( bot ) {
    this.commands       = {};
    this.bot            = bot;
}


Commands.prototype.addCommand = function( cmd, handler, description, acl )
{
    this.commands[ cmd ]    = new CommandInfo( cmd, handler, description, acl );
}


Commands.prototype.handle = function( jid, message )
{
    var deferred = Q.defer();
    var self    = this;
    var email   = this.getEmailFromJID( jid );
    var args    = this.getArgs( message );

    if ( args && args.length > 0 )
    {
        var cmd = args[ 0 ].toLowerCase();

        if ( cmd == "help" )
        {
            this.handleHelp( jid, message, args ).then( function ( help ) {
                console.log( "HALP MEH: " + help );
                deferred.resolve( help );
            }, function(error) {
                console.log( error );
                deferred.reject( error );
            });
        }

        if ( this.commands[ cmd ] != null )
        {
            this.bot.users.getUser( email ).then( function( user ) {
                var command = self.commands[ cmd ];

                if ( self.isAllowed( command, user ) )
                {
                    console.log(command);
                    self.bot[ command.handler ]( jid, args, user, email ).then( function ( msg ) {
                        console.log( "HELLO FROM THE OTHER SIDE: " + msg );
                        deferred.resolve( msg );
                    }, function( error ) {
                        console.log( error );
                        deferred.reject( error );
                    } );
                }
                else
                {
                    deferred.resolve("You do not have access to that command." );
                }
            }, function( err ) {
                console.log( "DB ERR: " + err );
                deferred.reject( "DB ERR: " + err );
            } );

        }
        else
        {
            deferred.resolve( "Unknown command: " + cmd + ".  Try typing help for more info." );
        }
    }

    return deferred.promise;
}


Commands.prototype.handleHelp       = function( jid, message, args )
{
    var deferred = Q.defer();
    var self     = this;
    var email    = this.getEmailFromJID( jid );

    this.bot.users.getUser( email ).then( function( user ) {
        if ( args.length == 1 )
        {
            var txt         = "";

            for ( var i in self.commands )
            {
                var info    = self.commands[ i ];

                if ( info.description != null && self.isAllowed( info, user ) )
                {
                    txt         += info.cmd + " -- " + info.description + "\n";
                }
            }

            deferred.resolve( txt );
        }
        else
        {
            var cmd         = args[ 1 ].toLowerCase();
            var info        = self.commands[ cmd ];

            if ( info && info.description != null )
            {
                if ( isAllowed( info, user ) )
                {
                    deferred.resolve(info.cmd + " -- " + info.description );
                }
                else
                {
                    deferred.resolve("You do not have access to that command." );
                }
            }
            else
            {
                deferred.resolve("No such command: " + args[ 0 ] );
            }
        }
    } );
}


Commands.prototype.isAllowed        = function( info, user )
{
    return info.acl <= 0 || user != null && user.getACL() >= info.acl;
}


Commands.prototype.getEmailFromJID = function( jid )
{
    return jid.split( '/' )[ 0 ];
}


Commands.prototype.getArgs = function( message )
{
    var regExp = /(".*?"|'.*?'|\S+)/gm;

    return message != null ? message.match( regExp ) : null;
}


function CommandInfo( cmd, handler, description, acl )
{
    this.cmd            = cmd;
    this.handler        = handler;
    this.description    = description;
    this.acl            = acl == null ? 0 : acl;
}


module.exports = exports = Commands;
