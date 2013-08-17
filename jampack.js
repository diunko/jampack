
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

function seq(){
  return Seq.prototype.def.apply(Seq,arguments)
}

Parser.lift = Parser.prototype.lift
Seq.def = Seq.prototype.def

function seq(){
  return Seq.prototype.def.apply(Seq,arguments)
}
function list(){
  return List.prototype.def.apply(List,arguments)
}
function string(){
  return String.prototype.def.apply(String,arguments)
}
function binary(){
  return Binary.prototype.def.apply(Binary,arguments)
}

module.exports = function(){return Parser.lift.apply(Parser,arguments)}
module.exports.seq = seq
module.exports.list = list
module.exports.string = string
module.exports.binary = binary
module.exports.Stream = function(buf,oft){return new Stream(buf,oft)}

