
var mp = require('msgpack')
var jp = require('./jampack')

var P = jp.string()

console.log(
  P.parse(
    jp.Stream(
      mp.pack('GET'))))


var P = jp.seq([jp.string,jp.string])


console.log(
  P.parse(
  jp.Stream(
    mp.pack(['GET','HTTP/1.1']))))


var P = jp.list(P)

// var P = jp.list(jp.seq([jp.string,jp.string]))

console.log(
  P.parse(
  jp.Stream(
    mp.pack([['aaa','bbb'],['ccc','ddd']]))))



var P = jp([
  jp.string, //method
  jp.string, //uri
  jp.string, //httpver
  jp.list([ //headers
    jp.string, //header name
    jp.string //header value
  ]),
  jp.binary //binary body
])

console.log(
  P.parse(
    jp.Stream(
      mp.pack(
        ['GET','/something/somewhere','HTTP/1.1',
         [['some','header'],
          ['some','value'],
          ['some','more'],
          ['and','another']],
         'binary-body']))))


