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
#include <stdint.h>
#include <time.h>
#include <sys/socket.h>
#include <libsocial/udpstream_private.h>
#include <libsocial/udpstream.h>
#include "jsglue.h"
extern struct udpstream* stream_new(int sock, struct sockaddr_storage* addr, socklen_t addrlen);

struct file
{
  char* name;
  void* content;
  size_t size;
};

struct fileinfo
{
  struct file* file;
  unsigned int pos;
};

static struct file* files=0;
static unsigned int filecount=0;
static struct fileinfo* fds=0;
static unsigned int fdcount=0;

static struct file* getfile(const char* path)
{
  unsigned int i;
  for(i=0; i<filecount; ++i)
  {
    if(!strcmp(files[i].name, path)){return &files[i];}
  }
  return 0;
}

ssize_t jsglue_read(int fd, void* buf, size_t size)
{
  if(fd<0){return -1;}
  if(size>fds[fd].file->size-fds[fd].pos){size=fds[fd].file->size-fds[fd].pos;}
  memcpy(buf, fds[fd].file->content+fds[fd].pos, size);
  return size;
}

ssize_t jsglue_write(int fd, const void* buf, size_t size)
{
// TODO: Writing
  return size;
}

int jsglue_open(const char* path, int flags, mode_t mode)
{
  struct file* f=getfile(path);
  if(!f){return -1;}
  unsigned int i;
  for(i=0; i<fdcount; ++i)
  {
    if(!fds[i].file){break;}
  }
  if(i==fdcount)
  {
    fds=realloc(fds, (++fdcount)*sizeof(struct fileinfo));
  }
  fds[i].file=f;
  fds[i].pos=0;
  return i;
}

int jsglue_stat(const char* path, struct stat* st)
{
  struct file* f=getfile(path);
  if(!f){return 1;}
  st->st_size=f->size;
  return 0;
}

void jsglue_close(int fd)
{
  fds[fd].file=0;
}

void jsglue_addfile(const char* path, const void* data, size_t size)
{
  struct file* f=getfile(path);
  if(!f) // New file
  {
    ++filecount;
    files=realloc(files, filecount*sizeof(struct file));
    f=&files[filecount-1];
  }else{ // Overwrite old
    free(f->name);
    free(f->content);
  }
  f->name=strdup(path);
  f->content=malloc(size);
  memcpy(f->content, data, size);
  f->size=size;
}

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
