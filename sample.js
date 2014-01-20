
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


var P = jp.map(jp.string, jp.string)

console.log(
    P.parse(
        jp.Stream(
            mp.pack({"abcde":"ghijkl"}))))


console.log(
    P.parse(
        jp.Stream(
            mp.pack({"abcde":"ghijkl", "abcde1":"ghijkl", "abcde2":"ghijkl",
            "abcde3":"ghijkl", "abcde4":"ghijkl", "abcde5":"ghijkl",
            "abcde6":"ghijkl", "abcde7":"ghijkl", "abcde8":"ghijkl",
            "abcde9":"ghijkl", "abcde10":"ghijkl", "abcde11":"ghijkl",
            "abcde12":"ghijkl", "abcde13":"ghijkl", "abcde14":"ghijkl",
            "abcde15":"ghijkl", "abcde16":"ghijkl"}))))



var P = jp([jp.string, jp.bool, jp.string, jp.int, jp.int, jp.string, jp.bool])

console.log(
  P.parse(
    jp.Stream(
      mp.pack(['1234123', true ,'oaijsfoiads', 123, 23, 'osidoindf', false]))))



