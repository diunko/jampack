

function Stream(){
  this._inbox = [];
  this._oft = 0;
}

Stream.prototype = {
  write: function(buf){
    __assert(Buffer.isBuffer(buf));
    this._inbox.push(buf);
    this._parse();
  },

  _parse: function(){

    while(true){
      [b,o] = get_next_buffer();

      if(!b){
        //we've consumed all of incoming buffers
        this._oft = 0
        break;
      }

      while(true) {
        [thing,o1] = parse_one_thing(b,o);
        if(!thing){
          __assert(b.length = o1); //we've consumed all of incoming buffer
          this._oft = o1; //save position, and exit: there is nothing more to be done
          break;
        }

        this._push(thing);
        o = o1;
        
      }
    }

    start_parse_one_thing: function(b,o){
      var b = b[o];
      if(b < 0x80){
        // 0x00..0x7f 0xxxxxxx positive fixnum
        return b
      } else if(b < 0x90){
        // 0x80..0x8f 1000xxxx fixMap
        var len = b & 0x0f
        return getMap(len)
      } else if(b < 0xaf){
        // 0x90..0x9f 1001xxxx fixArray
        var len = (b & 0x0f)
        return getMap(len)
      } else if(b < 0xc0){
        // 0xa0..0xbf 101xxxxx fixRaw
        var len = (b & 0x1f)
        return getRaw(len)
      } else if(0xe0<=b){
        // 0xe0..0xff: 11100000 negative fixnum
        return 0x100 - b
      } else {
        switch(b[o]){
        case 0xc0: //null
          return [null,1]
          // -- reserved
        case 0xc2: //false
          return [false,1]
        case 0xc3: //true
          return [true,1]
          // -- reserved
        case 0xca: //float
          return getFloat4()
        case 0xcb: //double
          return getFloat8()
        case 0xcc: //uint8
          return getUint8()
        case 0xcd: //uint16
          return getUint16()
        case 0xce: //uint32
          return getUint32()
        case 0xcf: //uint64
          return getUint64()
        case 0xd0: //int8
          return getInt8()
        case 0xd1: //int16
          return getInt16()
        case 0xd2: //int32
          return getInt32()
        case 0xd3: //int64
          return getInt64()
          // -- reserved
        case 0xda: //raw16
          var len = getUint16()
          return getRaw(len)
        case 0xdb: //raw32
          var len = getUint32()
          return getRaw(len)
        case 0xdc: //array16
          var len = getUint16()
          return getArray(len)
        case 0xdd: //array32
          var len = getUint32()
          return getArray(len)
        case 0xde: //map16
          var len = getUint16()
          return getMap(len)
        case 0xdf: //map32
          var len = getUint32()
          return getMap(len)
        }
      }
    },

    parse_one_thing: function(b,o){
      var s = this.state;

      {
        
      }
      
    },



    parse_buffer: function(s){
      
    }
    
    
    
    
    


    

    

    
    
    

    
    
    


    
    
    
    
  }
}




