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
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <time.h>
#include <sys/socket.h>
#include <libsocial/udpstream_private.h>
#include <libsocial/udpstream.h>
#include <libsocial/social.h>
#include "jsglue.h"
extern struct udpstream* stream_new(int sock, struct sockaddr_storage* addr, socklen_t addrlen);

void(*websockproxy_write)(struct sockaddr_storage*, socklen_t, const void*, size_t);
void websockproxy_setwrite(void(*writefunc)(struct sockaddr_storage*, socklen_t, const void*, size_t))
{
  websockproxy_write=writefunc;
}
void websockproxy_read(struct sockaddr_storage* addr, socklen_t addrlen, const void* buf, size_t payloadsize)
{
  // Find the stream
  struct udpstream* stream=udpstream_find(addr, addrlen);
  if(!stream){stream=stream_new(-1, addr, addrlen);}
  // Add to list of parsed packets
  ++stream->recvpacketcount;
  stream->recvpackets=realloc(stream->recvpackets, sizeof(struct packet)*stream->recvpacketcount);
  stream->recvpackets[stream->recvpacketcount-1].seq=(stream->wsseq++);
  stream->recvpackets[stream->recvpacketcount-1].buf=malloc(payloadsize);
  stream->recvpackets[stream->recvpacketcount-1].buflen=payloadsize;
  memcpy(stream->recvpackets[stream->recvpacketcount-1].buf, buf, payloadsize);
}

unsigned int getcirclecount(void)
{
  return social_self->circlecount;
}

// Find an empty circle and reset it, empty and nameless I guess, then return its index
unsigned int newcircle(void)
{
  unsigned int i;
  for(i=0; i<social_self->circlecount; ++i)
  {
    if(!social_self->circles[i].count && !social_self->circles[i].name){break;}
  }
  if(i==social_self->circlecount)
  {
    ++social_self->circlecount;
    social_self->circles=realloc(social_self->circles, social_self->circlecount*sizeof(struct friendslist));
  }else{
    free(social_self->circles[i].privacy.circles);
  }
  memset(&social_self->circles[i], 0, sizeof(struct friendslist));
  return i;
}
// TODO: how to configure privacy structs?

unsigned int circle_getcount(unsigned int i)
{
  if(i>=social_self->circlecount){return 0;}
  return social_self->circles[i].count;
}
const char* circle_getid(unsigned int i, unsigned int u)
{
  if(i>=social_self->circlecount){return 0;}
  if(u>=social_self->circles[i].count){return 0;}
  unsigned char* bin=social_self->circles[i].friends[u]->id;
  static char id[ID_SIZE*2+1];
  sprintf(id, PEERFMT, PEERARG(social_self->circles[i].friends[u]->id));
  return id;
}
const char* circle_getname(unsigned int i)
{
  if(i>=social_self->circlecount){return 0;}
  return social_self->circles[i].name;
}
void circle_setname(unsigned int i, const char* name)
{
  if(i>=social_self->circlecount){return;}
  free(social_self->circles[i].name);
  social_self->circles[i].name=strdup(name);
}
