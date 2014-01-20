
var __assert = require('assert')

var fail = {v:'<fail>'}

var dbg = 0

function Stream(buf,oft){
  this.b = buf || null
  this.i = oft || 0
}

Stream.prototype = {
  clone:function(){
    var s = new Stream()
    s.b = this.b
    s.i = this.i
    return s
  },
  restore:function(stream){
    this.b = stream.b
    this.i = stream.i
  }
}

function Parser(){}

Parser.prototype = {
  lift:function(p){
    if(p.parse && typeof p.parse === 'function'){
      return p
    } else if (typeof p === 'object' && typeof p.length === 'number'){
      return Seq.def(p)
    } else if (typeof p === 'string'){
      return Key.def(p)
    } else if (typeof p === 'function'){
      p = p()
      return Parser.lift(p)
    } else {
      __assert(false,
               'unsupported type lift to Parser')
    }
  },
  parse:function(stream){
    var s1 = stream.clone()
    var x = this._parse(stream)
    if(x === fail){
      stream.restore(s1)
      return fail
    } else {
      return this.builder(x)
    }
  },
  _parse:function(stream){
    this.error(stream,'Invalid Parser')
  },
  error:function(stream,msg){
    throw ['parse',this,stream,msg]
  },
  builder:function(e){
    return e
  }
}


function Bool(){}

Bool.prototype = {
  __proto__: Parser.prototype,
  _parse: function(s){
    var b0 = s.b[s.i]
    if(b0 === 0xc2){
      s.i += 1
      return false
    } else if (b0 === 0xc3){
      s.i += 1
      return true
    } else {
      return fail
    }
  }
}

function getUint8(b,o){
  return b[o]
}

function getUint16(b,o){
  return (b[o]<<8)|b[o+1]
}


function getUint32(b,o){
  return ((b[o]<<24)
    |(b[o+1]<<16)
    |(b[o+2]<<8)
    |(b[o+3]))>>>0
}

var MAX_INT = 0x1fffffffffffff
var MAX_HI = 0x1fffff

function getUint64(b,o){
  var hi = ((b[o]<<24)
         |(b[o+1]<<16)
         |(b[o+2]<<8)
         |(b[o+3]))>>>0
  var lo = ((b[o+4]<<24)
         |(b[o+6]<<16)
         |(b[o+6]<<8)
         |(b[o+7]))>>>0
  __assert(hi <= MAX_HI, 'uint53 overflow')
  return hi*0x100000000+lo
}

function getInt8(b,o){
  var r = getUint8(b,o)
  return r&0x80? 0xffffff00|r : r
}
function getInt16(b,o){
  var r = getUint16(b,o)
  return r&0x80000? 0xffff0000|r : r
}

function getInt32(b,o){
  return getUint32(b,o)|0
}

function getInt64(b,o){
  var hi = ((b[o]<<24)
         |(b[o+1]<<16)
         |(b[o+2]<<8)
         |(b[o+4]))
  var lo = ((b[o+4]<<24)
         |(b[o+5]<<16)
         |(b[o+6]<<8)
         |(b[o+7]))
  if(!(lo|hi))return 0
  if(lo === 0){
    var lo_ = 0xffffffff|0
    var hi_ = ~((hi-1)|0)
  } else {
    var lo_ = ~((lo-1)|0)
    var hi_ = ~hi
  }
  __assert(hi <= MAX_HI, 'int53 overflow')
  return -(hi*0x100000000+lo)

}


function Int(){}

Int.prototype = {
  __proto__: Parser.prototype,
  _parse: function(s){
    var b0 = s.b[s.i]
    var r = 0, o =0

    if((0x7f & b0) === b0){
      r = b0
      o = 0
    } else {
      
      switch(b0){
      case 0xcc: //uint8
        r = getUint8(s.b, s.i+1)
        o = 1
        break
      case 0xcd: //uint16
        r = getUint16(s.b, s.i+1)
        o = 2
        break
      case 0xce: //uint32
        r = getUint32(s.b, s.i+1)
        o = 4
        break
      case 0xcf: //uint64
        r = getUint64(s.b, s.i+1)
        o = 8
        break

      case 0xd0: //int8
        r = getInt8(s.b, s.i+1)
        o = 1
        break
      case 0xd1: //int16
        r = getInt16(s.b, s.i+1)
        o = 2
        break
      case 0xd2: //int32
        r = getInt32(s.b, s.i+1)
        o = 4
        break
      case 0xd3: //int64
        r = getInt64(s.b, s.i+1)
        o = 8
        break
      default:
        return fail
      }

    }
    s.i += o + 1
    return r
  }
}

function Seq(pp){
  this.items = (pp || [])
}

Seq.prototype = {
  __proto__:Parser.prototype,
  def:function(items){
    var S = new Seq()
    S.items = items.map(function(item,i){
      return Parser.lift(item)
    })
    return S
  },
  _parse:function(s){
    var b0 = s.b[s.i]
    switch(true){
    case (b0 & 0xf0) === 0x90:{
      var len = b0 & 0x0f
      var base = s.i + 1
      break
    }
    case b0 === 0xdc:{
      var len = (s.b[s.i+1]<<8)+s.b[s.i+2]
      var base = s.i+3
      break
    }
    case b0 === 0xdd:{
      var len = (s.b[s.i+1]<<24) + (s.b[s.i+2]<<16) + (s.b[s.i+3]<<8) + (s.b[s.i+4])
      var base = s.i+5
      break
    }
    default:{
      dbg && console.log('not a seq',b0.toString(16))
      return fail
    }
    }
    if(len !== this.items.length){
      dbg && console.log('seq len doesn\'t match')
      return fail
    }
    s.i = base
    var ee = []
    for(var i=0;i<len;i++){
      var item = this.items[i]
      dbg && console.log(item)
      dbg && console.log(s)
      var r = item.parse(s)
      if(r === fail){
        dbg && console.log('item fail')
        return fail
      }
      ee.push(r)
    }
    return ee
  }
}

function List(item){
  this.item = null
}

List.prototype = {
  __proto__:Parser.prototype,
  def:function(item){
    var L = new List()
    L.item = Parser.lift(item)
    return L
  },
  _parse:function(s){
    var b0 = s.b[s.i]
    switch(true){
    case (b0 & 0xf0) === 0x90:{
      var len = b0 & 0x0f
      var base = s.i+1
      break
    }
    case b0 === 0xdc:{
      var len = (s.b[s.i+1]<<8)+s.b[s.i+2]
      var base = s.i+3
      break
    }
    case b0 === 0xdd:{
      var len = (s.b[s.i+1]<<24) + (s.b[s.i+2]<<16) + (s.b[s.i+3]<<8) + (s.b[s.i+4])
      var base = s.i+5
      break
    }
    default:{
      return fail
    }
    }
    s.i = base
    var ee = []
    for(var i=0;i<len;i++){
      var r = this.item.parse(s)
      if(r === fail){
        return fail
      }
      ee.push(r)
    }
    return ee
  }
}

function Map(key, item){
  this.key = null
  this.item = null
}

Map.prototype = {
  __proto__:Parser.prototype,
  def:function(key, item){
    var M = new Map()
    M.key = Parser.lift(key)
    M.item = Parser.lift(item)
    return M
  },
  _parse:function(s){
    var b0 = s.b[s.i]
    switch(true){
    case (b0 & 0xf0) === 0x80:{
      var len = b0 & 0x0f
      var base = s.i+1
      break
    }
    case b0 === 0xde:{
      var len = (s.b[s.i+1]<<8)+s.b[s.i+2]
      var base = s.i+3
      break
    }
    case b0 === 0xdf:{
      var len = (s.b[s.i+1]<<24) + (s.b[s.i+2]<<16) + (s.b[s.i+3]<<8) + (s.b[s.i+4])
      var base = s.i+5
      break
    }
    default:{
      return fail
    }
    }
    s.i = base
    var ee = {}
    for(var i=0;i<len;i++){
      var k = this.key.parse(s)
      if(k === fail){
          return fail
      }
      var v = this.item.parse(s)
      if(v === fail){
        return fail
      }
      ee[k] = v
    }
    return ee
  }
}

function Binary(){}

Binary.prototype = {
  __proto__:Parser.prototype,
  def:function(){
    return new Binary()
  },
  _parse:function(s){
    var b0 = s.b[s.i]
    switch(true){
    case (b0 & 0xe0) === 0xa0:{
      var len = b0 & (0x20-1)
      var val = s.b.slice(s.i+1,s.i+1+len)
      s.i += 1+len
      break
    }
    case b0 === 0xda:{
      var len = (s.b[s.i+1]<<8)+s.b[s.i+2]
      var val = s.b.slice(s.i+3,s.i+3+len)
      s.i += 3+len
      break
    }
    case b0 === 0xdb:{
      var len = (s.b[s.i+1]<<24) + (s.b[s.i+2]<<16) + (s.b[s.i+3]<<8) + (s.b[s.i+4])
      var val = s.b.slice(s.i+5,s.i+5+len)
      s.i += 5+len
      break
    }
    default:{
      return fail
    }
    }
    return val
  }
}

function String(){}


String.prototype = {
  __proto__:Parser.prototype,
  def:function(){
    return new String()
  },
  _parse:function(s){
    var b0 = s.b[s.i]
    switch(true){
    case (b0 & 0xe0) === 0xa0:{
      var len = b0 & (0x20-1)
      var val = s.b.slice(s.i+1,s.i+1+len)
      s.i += 1+len
      break
    }
    case b0 === 0xda:{
      var len = (s.b[s.i+1]<<8)+s.b[s.i+2]
      var val = s.b.slice(s.i+3,s.i+3+len)
      s.i += 3+len
      break
    }
    case b0 === 0xdb:{
      var len = (s.b[s.i+1]<<24) + (s.b[s.i+2]<<16) + (s.b[s.i+3]<<8) + (s.b[s.i+4])
      var val = s.b.slice(s.i+5,s.i+5+len)
      s.i += 5+len
      break
    }
    default:{
      dbg && console.log('not a string',s,b0.toString(16))
      return fail
    }
    }
    return val.toString(this.encoding || 'utf8')
  }
}

Parser.lift = Parser.prototype.lift
Seq.def = Seq.prototype.def

function bool(){
  return new Bool()
}
function int(){
  return new Int()
}
function seq(){
  return Seq.prototype.def.apply(Seq,arguments)
}
function list(){
  return List.prototype.def.apply(List,arguments)
}
function map(){
  return Map.prototype.def.apply(Map,arguments)
}
function string(){
  return String.prototype.def.apply(String,arguments)
}
function binary(){
  return Binary.prototype.def.apply(Binary,arguments)
}

module.exports = function(){return Parser.lift.apply(Parser,arguments)}
module.exports.int = int
module.exports.bool = bool
module.exports.seq = seq
module.exports.list = list
module.exports.map = map
module.exports.string = string
module.exports.binary = binary
module.exports.Stream = function(buf,oft){return new Stream(buf,oft)}

