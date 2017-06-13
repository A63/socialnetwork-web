/*
    webpeer, a websocket-udpstream proxy for socialnetwork-web
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
#include <unistd.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include "addrlist.h"

struct addrlist verified={0,0,0};
static struct addrlist quarantine={0,0,0};

static int getlock(const char* path)
{
  int f;
  while((f=open(path, O_CREAT|O_EXCL|O_WRONLY, 0600))<0)
  {
    usleep(100);
  }
  return f;
}

static void list_update(struct addrlist* list, const char* file)
{
  list->updated=time(0);
  struct stat st;
  if(stat(file, &st)){return;}
  int f=open(file, O_RDONLY);
  if(f<0){return;}
  free(list->addr);
  list->count=st.st_size/sizeof(struct sockaddr_storage);
  list->addr=malloc(list->count*sizeof(struct sockaddr_storage));
  read(f, list->addr, list->count*sizeof(struct sockaddr_storage));
  close(f);
}

// Check if addresses match, with or without port numbers
static char addrcmp(struct sockaddr_storage* a, struct sockaddr_storage* b, char port)
{
  if(a->ss_family!=b->ss_family){return 0;}
  #define checkmember(st,x) if(memcmp(&((st*)a)->x, &((st*)b)->x, sizeof(((st*)a)->x))){return 0;}
  switch(a->ss_family)
  {
  case AF_INET: checkmember(struct sockaddr_in, sin_addr); if(port){checkmember(struct sockaddr_in, sin_port);} break;
  case AF_INET6: checkmember(struct sockaddr_in6, sin6_addr); if(port){checkmember(struct sockaddr_in6, sin6_port);} break;
  default: return 0; // Unhandled address families
  }
  return 1;
}

static char list_find(struct addrlist* list, struct sockaddr_storage* addr, char port)
{
  unsigned int i;
  for(i=0; i<list->count; ++i)
  {
    if(addrcmp(&list->addr[i], addr, port)){return 1;}
  }
  return 0;
}

static void list_add(struct addrlist* list, struct sockaddr_storage* addr, socklen_t addrlen)
{
  ++list->count;
  list->addr=realloc(list->addr, list->count*sizeof(struct sockaddr_storage));
  memset(&list->addr[list->count-1], 0, sizeof(struct sockaddr_storage));
  memcpy(&list->addr[list->count-1], addr, addrlen);
}

#define list_save(list,f) write(f, (list)->addr, (list)->count*sizeof(struct sockaddr_storage));

static char checkaddr(struct sockaddr_storage* addr, socklen_t addrlen)
{
  if(addrlen<=sizeof(sa_family_t)){return 0;}
  if(addrlen>sizeof(struct sockaddr_storage)){return 0;} // Too big
  switch(addr->ss_family)
  {
    case AF_INET: return addrlen>=sizeof(struct sockaddr_in);
    case AF_INET6: return addrlen>=sizeof(struct sockaddr_in6);
  }
  return 0; // Unhandled address families
}

// Check if we can connect to this address given the rules that only one connection attempt at a time may be done to a host, with the exception of already verified host/port combinations
char addrlist_check(struct sockaddr_storage* addr, socklen_t addrlen)
{
  // Check that addrlen makes sense (don't accept 0-byte addresses and try to access non-0-byte data within)
  if(!checkaddr(addr, addrlen)){return 0;}
  // Check if it's already verified (keep in-memory cache and update based on timestamp?)
  if(list_find(&verified, addr, 1)){return 1;}
  time_t now=time(0);
  if(verified.updated+5<now) // Update and check again
  {
    list_update(&verified, "verified.addr");
    if(list_find(&verified, addr, 1)){return 1;}
  }
  // Check if it's quarantined. if it isn't, obtain a lock, update and check again
  if(list_find(&quarantine, addr, 0)){return 0;}
  int f=getlock("quarantine.addr.lock");
  list_update(&quarantine, "quarantine.addr");
  if(list_find(&quarantine, addr, 0)){close(f); unlink("quarantine.addr.lock"); return 0;}
  // Not verified and not quarantined, quarantine it and allow this one connection attempt for verification
  list_add(&quarantine, addr, addrlen);
  list_save(&quarantine, f);
  close(f);
  rename("quarantine.addr.lock", "quarantine.addr");
  return 1;
}

// Remove from quarantine and add to verified
void addrlist_verify(struct sockaddr_storage* addr, socklen_t addrlen)
{
  if(!checkaddr(addr, addrlen)){return;} // Invalid address
  if(!list_find(&quarantine, addr, 1)){return;} // Wasn't quarantined
  int f=getlock("quarantine.addr.lock");
  list_update(&quarantine, "quarantine.addr"); // Update so we don't accidentally remove a recently added host
  unsigned int i;
  for(i=0; i<quarantine.count; ++i)
  {
    if(addrcmp(&quarantine.addr[i], addr, 1)){break;}
  }
  if(i==quarantine.count){close(f); unlink("quarantine.addr.lock"); return;} // Wasn't quarantined after all (this shouldn't happen, or maybe it should? remote peer making contact with another session first)
  // Remove from quarantine
  --quarantine.count;
  memmove(&quarantine.addr[i], &quarantine.addr[i+1], (quarantine.count-i)*sizeof(struct sockaddr_storage));
  list_save(&quarantine, f);
  close(f);
  rename("quarantine.addr.lock", "quarantine.addr");
  // Add to verified
  f=getlock("verified.addr.lock");
  list_update(&verified, "verified.addr"); // Update so we don't accidentally remove a recently added host
  list_add(&verified, addr, addrlen);
  list_save(&verified, f);
  close(f);
  rename("verified.addr.lock", "verified.addr");
}
