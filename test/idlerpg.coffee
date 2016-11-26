Helper = require('hubot-test-helper')
chai = require 'chai'

expect = chai.expect

idleHelper = new Helper('../src/idlerpg.coffee')

describe 'idlerpg tests', ->
  beforeEach ->
    @room = idleHelper.createRoom()

  afterEach ->
    @room.destroy()

  context 'play a game', ->
    it 'tries to register correctly', ->
      @room.user.say('matt', '!idlerpg register bard').then =>
        expect(@room.messages).to.eql [
          ['matt', '!idlerpg register bard']
          ['hubot', 'Registered a new account with the class: bard.  You are level 1.  Next level in: 10 minutes']
        ]

    it 'prints info for account', ->
      @room.user.say('matt', '!idlerpg register').then =>
        expect(@room.messages).to.eql [
          ['matt', '!idlerpg register']
          ['hubot', 'Your account is already registered']
        ]

    it 'prints info for account', ->
      @room.user.say('matt', '!idlerpg info').then =>
        expect(@room.messages).to.eql [
          ['matt', '!idlerpg info']
          ['hubot', '']
        ]

    it 'prints info for account', ->
      @room.user.say('matt', '!idlerpg monsters').then =>
        expect(@room.messages).to.eql [
          ['matt', '!idlerpg monsters']
          ['hubot', '']
        ]

