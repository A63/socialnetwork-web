/*
    socialnetwork-web, peer-to-peer social network web client
    Copyright (C) 2017  alicia@ion.nu

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License version 3
    as published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
var connection;
function websockwrite(addr, addrlen, buf, size)
{
  addr=new Blob([Module.HEAP8.subarray(addr, addr+addrlen)]);
  buf=new Blob([Module.HEAP8.subarray(buf, buf+size)]);
  connection.send(addr);
  connection.send(buf);
}

var websockproxy_read;
var peer_new_unique;
var getcirclecount;
var circle_getcount;
var circle_getname;
var circle_getid;
var setcircle;
var circle_getprivacyptr;
var social_addfriend;
var social_finduser;
var user_getupdatecount;
var user_getupdateptr;
var update_gettype;
var update_gettimestamp;
var update_getprivacy;
var update_post_getmessage;
var update_field_getname;
var update_field_getvalue;
var self_getid;
var privacy_getflags;
var privacy_getcirclecount;
var privacy_getcircle;
var createpost;
var setfield;

var websockproxy_to=false;
var firstpacket=true;
function handlenet(data)
{
  var f=new FileReader();
  f.onload=function()
  {
    data=new Uint8Array(f.result);
    if(firstpacket) // Bootstrap
    {
      firstpacket=false;
      // Read sockaddr lengths and pass subarrays until we reach the end of the array
      while(data.length>2)
      {
        var len=data[0]*256+data[1];
        peer_new_unique(-1, data.subarray(2, 2+len), len);
        data=data.subarray(2+len);
      }
      return;
    }
    if(websockproxy_to)
    {
      websockproxy_read(websockproxy_to, websockproxy_to.length, data, data.length);
      _peer_handlesocket(-1); // Handle whatever we just received
      websockproxy_to=false;
    }else{websockproxy_to=data;}
  };
  f.readAsArrayBuffer(data.data);
}
function init(privkey)
{
  websockproxy_read=Module.cwrap('websockproxy_read', null, ['array','number','array','number']);
  peer_new_unique=Module.cwrap('peer_new_unique', 'array', ['number','array','number']);
  // Low level access functions
  getcirclecount=Module.cwrap('getcirclecount', 'number', []);
  circle_getcount=Module.cwrap('circle_getcount', 'number', ['number']);
  circle_getname=Module.cwrap('circle_getname', 'string', ['number']);
  circle_getid=Module.cwrap('circle_getid', 'string', ['number','number']);
  setcircle=Module.cwrap('setcircle', null, ['number','string','number','array','number']);
  circle_getprivacyptr=Module.cwrap('circle_getprivacyptr', 'number', ['number']);
  social_addfriend=Module.cwrap('social_addfriend', null, ['array', 'number']);
  social_finduser=Module.cwrap('social_finduser', 'number', ['array']);
  user_getupdatecount=Module.cwrap('user_getupdatecount', 'number', ['number']);
  user_getupdateptr=Module.cwrap('user_getupdateptr', 'number', ['number','number']);
  update_gettype=Module.cwrap('update_gettype', 'string', ['number']);
  update_gettimestamp=Module.cwrap('update_gettimestamp', 'number', ['number']);
  update_getprivacy=Module.cwrap('update_getprivacy', 'number', ['number']);
  update_post_getmessage=Module.cwrap('update_post_getmessage', 'string', ['number']);
  update_field_getname=Module.cwrap('update_field_getname', 'string', ['number']);
  update_field_getvalue=Module.cwrap('update_field_getvalue', 'string', ['number']);
  self_getid=Module.cwrap('self_getid', 'string', []);
  privacy_getflags=Module.cwrap('privacy_getflags', 'number', ['number']);
  privacy_getcirclecount=Module.cwrap('privacy_getcirclecount', 'number', ['number']);
  privacy_getcircle=Module.cwrap('privacy_getcircle', 'number', ['number','number']);
  createpost=Module.cwrap('createpost', null, ['string','number','array','number']);
  setfield=Module.cwrap('setfield', null, ['string','string','number','array','number']);

  _websockproxy_setwrite(Runtime.addFunction(websockwrite));
  FS.writeFile('privkey.pem', privkey, {});
  Module.ccall('social_init', null, ['string', 'string'], ['privkey.pem', '']);
  connection=new WebSocket('wss://'+document.domain+':5000/', 'socialwebsock-0.1');
  connection.onmessage=handlenet;
  connection.onclose=function(){alert('The connection to the server was lost.');};
}
function getcircles()
{
  var circles=new Array();
  var len=getcirclecount();
  for(var i=0; i<len; ++i)
  {
    var circle=new Object();
    circle.name=circle_getname(i);
    circle.index=i;
    if(circle_getcount(i)>0 || circle.name!=''){circles.push(circle);}
  }
  return circles;
}
function circle_getfriends(index)
{
  // Call C functions to gather number of friends and their IDs
  var friends=new Array();
  var count=circle_getcount(index);
  for(var i=0; i<count; ++i)
  {
    friends.push(circle_getid(index, i));
  }
  return friends;
}
function newcircle()
{
  var len=getcirclecount();
  for(var i=0; i<len; ++i)
  {
    var name=circle_getname(i);
    var count=circle_getcount(i);
    if((!name || name=='') && count==0){break;}
  }
  return i;
}
function circle_getprivacy(index)
{
  var ptr=circle_getprivacyptr(index);
  return getprivacy(ptr);
}
function hextobin(hex)
{
  var bin=new Array();
  for(var i=0; i<hex.length; i+=2)
  {
    bin.push(parseInt(hex.substring(i,i+2), 16));
  }
  return new Uint8Array(bin);
}
function getuser(id)
{
  var userptr=social_finduser(hextobin(id));
  if(!userptr){return false;}
  var user=new Object();
  user.ptr=userptr;
  user.id=id;
// TODO: Gather more user data? No need to store updates themselves in user objects though, except for fields
  user.updatecount=user_getupdatecount(userptr);
  user.fields={};
  for(var i=0; i<user.updatecount; ++i)
  {
    var update=user_getupdate(user, i);
    if(update.type=='Field')
    {
      user.fields[update.name]=update;
    }
  }
  return user;
}
function user_getupdate(user, index)
{
  var update=new Object();
  var ptr=user_getupdateptr(user.ptr, index);
  update.type=update_gettype(ptr);
  update.timestamp=update_gettimestamp(ptr);
  update.privacy=getprivacy(update_getprivacy(ptr));
  // Get type-specific data
  switch(update.type)
  {
  case 'Post':
    update.message=update_post_getmessage(ptr);
    break;
  case 'Field':
    update.name=update_field_getname(ptr);
    update.value=update_field_getvalue(ptr);
    break;
  }
  return update;
}
function privacy(flags, circles)
{
  this.flags=flags;
  this.circles=circles;
  this.toString=function()
  {
    if(this.flags&1){return 'Everyone';}
    if(this.flags&2){return 'Friends';}
    return 'Select circles only ('+this.circles.length+')';
  };
  this.bincircles=function()
  { // Can only pass Uint8 arrays to C functions, so construct our Uint32 values from Uint8 pieces
    var circles=[];
    for(circle of this.circles)
    {
      circles.push(circle.index&0xff);
      circles.push((circle.index&0xff00)/0x100);
      circles.push((circle.index&0xff0000)/0x10000);
      circles.push((circle.index&0xff000000)/0x1000000);
    }
    return new Uint8Array(circles);
  };
}
function getprivacy(ptr)
{
  var flags=privacy_getflags(ptr);
  var count=privacy_getcirclecount(ptr);
  var circles=[];
  for(var i=0; i<count; ++i)
  {
    var index=privacy_getcircle(ptr, i);
    var circle={
      'name':circle_getname(index),
      'index':index
    };
    circles.push(circle);
  }
  return new privacy(flags, circles);
}
