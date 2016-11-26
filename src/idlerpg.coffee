# Description:
#   A better implementation of factoid support for your hubot.
#   Supports history (in case you need to revert a change), as
#   well as factoid popularity, aliases and @mentions.
#
# Dependencies:
#   tingodb
#   nicetime
#   q
#
# Configuration:
#
# Commands:
#   !idlerpg register - register for a game
#
# Author:
#   mattwwarren

Idle = require './idlerpg/idle.js'

module.exports = (robot) ->
  @idle = new Idle robot

  robot.hear @idle.commandRegex, (msg) =>
    user = msg.envelope.user.name.toLowerCase()
    command = msg.match[1]
    options = msg.match[2]
    console.log command + options
    @idle.handleMessage(user, command + ' ' + options).then( (resp) =>
      console.log 'RESP: ' + resp
      msg.send resp
    )
