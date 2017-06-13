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
#include <stdio.h>
#include <string.h>
#include <poll.h>
#include <netdb.h>
#include <netinet/in.h>
#include <libsocial/udpstream.h>
#include <libwebsocket/websock.h>
#include "addrlist.h"

const char* verifyproto(const char* path, const char* host, char* protocol, const char* origin)
{
  if(strcmp(path, "/")){return 0;}
  if(strcmp(protocol, "socialwebsock-0.1")){return 0;}
  return "socialwebsock-0.1";
}

void webpeer(int sock)
{
// printf("Handling connection...\n");
  websock_conn* conn=websock_new(sock, 1, "cert.pem", "priv.pem");
  if(!websock_handshake_server(conn, verifyproto, 0)){printf("Handshake failed\n"); return;}
  int udpsock=socket(PF_INET, SOCK_DGRAM, IPPROTO_UDP);
  // First send a list of bootstrap peers
  if(!verified.count) // No verified peers yet, suggest localhost:4000 as a starting point
  {
    struct sockaddr_in bootstrapaddr={
      .sin_family=AF_INET,
      .sin_addr.s_addr=htonl(0x7f000001),
      .sin_port=htons(4000)
    };
    uint16_t len=htons(sizeof(bootstrapaddr));
    char buf[sizeof(len)+sizeof(bootstrapaddr)];
    memcpy(buf, &len, sizeof(len));
    memcpy(buf+sizeof(len), &bootstrapaddr, sizeof(bootstrapaddr));
    websock_write(conn, buf, sizeof(len)+sizeof(bootstrapaddr), WEBSOCK_BINARY);
  }else{
    // Construct a single message containing all peers
    unsigned int size=verified.count*(sizeof(uint16_t)+sizeof(struct sockaddr_storage));
    char buf[size];
    void* ptr=buf;
    unsigned int i;
    for(i=0; i<verified.count; ++i)
    {
      uint16_t len=0;
      switch(verified.addr[i].ss_family)
      {
        case AF_INET: len=htons(sizeof(struct sockaddr_in)); break;
        case AF_INET6: len=htons(sizeof(struct sockaddr_in6)); break;
      }
      if(!len){continue;}
      memcpy(ptr, &len, sizeof(len));
      ptr+=sizeof(len);
      len=ntohs(len);
      memcpy(ptr, &verified.addr[i], len);
      ptr+=len;
    }
  }
  // Listen to client and udpstream socket and pass messages back and forth (client handles the TLS within the udpstream)
  struct pollfd pfd[]={{.fd=sock, .events=POLLIN, .revents=0}, {.fd=udpsock, .events=POLLIN, .revents=0}};
  while(1)
  {
    poll(pfd, 2, -1);
    if(pfd[0].revents)
    {
printf("Handling websocket input...\n");
      pfd[0].revents=0;
      // Read the address
      struct websock_head head;
      if(!websock_readhead(conn, &head)){break;}
      socklen_t addrlen=head.length;
      char addr[addrlen];
      while(!websock_readcontent(conn, addr, &head));
      // Read the payload
      if(!websock_readhead(conn, &head)){break;}
      char buf[head.length];
      while(!websock_readcontent(conn, buf, &head));
      struct udpstream* stream=udpstream_find((struct sockaddr_storage*)addr, addrlen);
      if(!stream) // TODO: Check against blocklist (don't let people use this service to flood others over UDP), also add a brief block for the entire host until we know this connection is ok
      {
        if(!addrlist_check((struct sockaddr_storage*)addr, addrlen)){continue;}
        stream=udpstream_new(udpsock, (struct sockaddr_storage*)addr, addrlen);
      }
// printf("Writing %u bytes\n", head.length);
      udpstream_write(stream, buf, head.length);
    }
    if(pfd[1].revents)
    {
printf("Handling udpsocket input...\n");
      pfd[1].revents=0;
      udpstream_readsocket(udpsock);
      struct udpstream* stream;
      while((stream=udpstream_poll()))
      {
        char buf[2048];
        ssize_t len=udpstream_read(stream, buf, 2048);
        if(len<1){udpstream_close(stream); continue;}
        struct sockaddr_storage addr;
        socklen_t addrlen=sizeof(addr);
        udpstream_getaddr(stream, &addr, &addrlen);
        addrlist_verify(&addr, addrlen);
        websock_write(conn, &addr, addrlen, WEBSOCK_BINARY);
        websock_write(conn, buf, len, WEBSOCK_BINARY);
      }
    }
  }
// TODO: At end of session, update the list of bootstrap peers
}
