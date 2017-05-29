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
  addr=new Blob(Module.HEAP8.subarray(addr, addr+addrlen));
  buf=new Blob(Module.HEAP8.subarray(buf, buf+size));
  connection.send(addr);
  connection.send(buf);
}

var websockproxy_read;
var peer_new_unique;

var websockproxy_to=false;
var firstpacket=true;
function handlenet(data)
{
  var f=new FileReader();
  f.readAsArrayBuffer(data.data);
  data=new Int8Array(f.result);
  if(firstpacket) // Bootstrap
  {
    firstpacket=false;
    // TODO: Read lengths and pass subarrays until we reach the end of the array. length=data[pos]*256+data[pos+1]
    peer_new_unique(-1, data, data.length);
    return;
  }
  if(websockproxy_to)
  {
    websockproxy_read(websockproxy_to, websockproxy_to.length, data, data.length);
    _peer_handlesocket(-1); // Handle whatever we just received
  }else{websockproxy_to=data;}
}
function init(privkey)
{
  websockproxy_read=Module.cwrap('websockproxy_read', null, ['array', 'number', 'array', 'number']);
  peer_new_unique=Module.cwrap('peer_new_unique', 'array', ['number', 'array', 'number']);
  _websockproxy_setwrite(Runtime.addFunction(websockwrite));
  connection=new WebSocket('wss://127.0.0.1:5000/', 'socialwebsock-0.1');
  connection.onmessage=handlenet;
  connection.onclose=function(){alert('The connection to the server was lost.');};
  Module.ccall('social_init', null, ['string', 'string'], [privkey, '']);
}
