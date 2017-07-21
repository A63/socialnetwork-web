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
var newcircle;
var circle_getcount;
var circle_getname;
var circle_setname;
var circle_getid;
var social_addfriend;
var social_finduser;
var user_getupdatecount;
var user_getupdatetype;
var user_getupdatetimestamp;
var self_getid;

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
  websockproxy_read=Module.cwrap('websockproxy_read', null, ['array', 'number', 'array', 'number']);
  peer_new_unique=Module.cwrap('peer_new_unique', 'array', ['number', 'array', 'number']);
  // Low level access functions
  getcirclecount=Module.cwrap('getcirclecount', 'number', []);
  newcircle=Module.cwrap('newcircle', 'number', []);
  circle_getcount=Module.cwrap('circle_getcount', 'number', ['number']);
  circle_getname=Module.cwrap('circle_getname', 'string', ['number']);
  circle_setname=Module.cwrap('circle_setname', null, ['number', 'string']);
  circle_getid=Module.cwrap('circle_getid', 'string', ['number','number']);
  social_addfriend=Module.cwrap('social_addfriend', null, ['array', 'number']);
  social_finduser=Module.cwrap('social_finduser', 'number', ['array']);
  user_getupdatecount=Module.cwrap('user_getupdatecount', 'number', ['number']);
  user_getupdatetype=Module.cwrap('user_getupdatetype', 'string', ['number','number']);
  user_getupdatetimestamp=Module.cwrap('user_getupdatetimestamp', 'number', ['number','number']);
  self_getid=Module.cwrap('self_getid', 'string', []);

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
// TODO: Gather more user data? No need to store updates themselves in user objects though
  user.updatecount=user_getupdatecount(userptr);
  return user;
}
function user_getupdate(user, index)
{
  var update=new Object();
  update.type=user_getupdatetype(user.ptr, index);
  update.timestamp=user_getupdatetimestamp(user.ptr, index);
// TODO: Get type-specific data
  return update;
}
